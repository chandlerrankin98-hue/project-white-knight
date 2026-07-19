// Bidirectional connection scan with backfill.
//
// After a save, this scans the new episodes against their peers (outward +
// inward, per direction) AND — as a backfill — any pairs among OLDER logged
// episodes that were never scanned before. So if the user disabled auto-scan
// for a stretch, saving the next episode catches the graph up.
//
// Uses a persistent per-campaign "scanned pairs" set in localStorage (see
// scannedPairs.js) so repeat runs are cheap: each pair is only scanned once.
// Applies a per-save PAIR cap so a huge campaign doesn't get slammed on one
// save; whatever's left waits for the next save.
//
// Sends one Anthropic request per SOURCE episode, grouping all of its
// unscanned peers into that source's candidate shortlist. That's O(N) requests
// for a first backfill, not O(N^2).

import { fetchSuggestedConnections } from "./episodeConnections.js";
import { applyConnections } from "./applyConnections.js";
import { pairKey, loadScannedPairs, saveScannedPairs } from "./scannedPairs.js";

const CONCURRENCY = 4;
// Hard ceiling on how many pair-scans a single save can trigger. Prevents a
// long-campaign save from running dozens of AI calls at once — leftover pairs
// backfill on subsequent saves.
const MAX_PAIRS_PER_SAVE = 60;

async function pMap(items, worker, limit) {
  const out = new Array(items.length);
  let i = 0;
  async function next() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { out[idx] = await worker(items[idx], idx); }
      catch { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return out;
}

// Build the list of (source, candidates) tasks for a save, honoring the
// scanned-pair set and the per-save pair cap.
function buildTasks({ newEpisodes, allEpisodes, scannedPairs }) {
  // Group new episodes by campaign so cross-campaign saves stay tidy (in
  // practice this session's saves are always single-campaign, but we don't
  // assume it).
  const byCamp = new Map();
  for (const ne of newEpisodes) {
    if (!byCamp.has(ne.campaign)) byCamp.set(ne.campaign, []);
    byCamp.get(ne.campaign).push(ne);
  }

  const tasks = [];
  let pairsBudget = MAX_PAIRS_PER_SAVE;

  for (const [camp, newInCamp] of byCamp) {
    if (pairsBudget <= 0) break;
    const peers = allEpisodes.filter((e) => e.campaign === camp);
    const newIds = new Set(newInCamp.map((e) => e.id));

    // Helper: given a source episode, return the peers whose pair with source
    // hasn't been scanned yet. Respects the per-save pair budget.
    const unscannedPeersOf = (source, candidateList) => {
      const out = [];
      for (const c of candidateList) {
        if (c.id === source.id) continue;
        if (pairsBudget <= 0) break;
        if (scannedPairs.has(pairKey(source.id, c.id))) continue;
        out.push(c);
        pairsBudget -= 1;
      }
      return out;
    };

    // 1) Outward from each new episode -> all peers (prioritized).
    for (const ne of newInCamp) {
      const cands = unscannedPeersOf(ne, peers);
      if (cands.length) tasks.push({ source: ne, candidates: cands });
      if (pairsBudget <= 0) break;
    }

    // 2) Backfill: for each OLDER episode, gather its unscanned older peers.
    // We deliberately EXCLUDE the new episodes from candidates here because
    // step (1) already covered new<->old pairs; those pair keys will be marked
    // scanned by step (1)'s completion, so we don't want to double-count them.
    if (pairsBudget > 0) {
      const olderEpisodes = peers.filter((e) => !newIds.has(e.id));
      for (const src of olderEpisodes) {
        if (pairsBudget <= 0) break;
        const cands = unscannedPeersOf(src, olderEpisodes);
        if (cands.length) tasks.push({ source: src, candidates: cands });
      }
    }
  }

  return { tasks, deferredPairs: pairsBudget < 0 ? 0 : 0 }; // deferred info unused for now
}

// newEpisodes: episodes just added.
// allEpisodes: full episode list AFTER the new ones (batch-mates included).
// existingConnections: current connections snapshot (deduplicates against them).
// addConnection: CRUD from useTrackerData.
// onProgress: optional (done, total) => void for progress toasts.
// Returns the number of connections actually added.
export async function scanConnectionsForNewEpisodes({
  newEpisodes,
  allEpisodes,
  existingConnections,
  addConnection,
  onProgress,
}) {
  if (!newEpisodes.length) return 0;

  // Load scanned-pair sets per campaign involved.
  const campaigns = new Set(newEpisodes.map((e) => e.campaign));
  const scannedByCamp = new Map();
  for (const c of campaigns) scannedByCamp.set(c, loadScannedPairs(c));
  // Flat view for the task builder.
  const scannedPairs = new Set();
  for (const s of scannedByCamp.values()) for (const k of s) scannedPairs.add(k);

  const { tasks } = buildTasks({ newEpisodes, allEpisodes, scannedPairs });
  if (!tasks.length) return 0;

  const total = tasks.length;
  let done = 0;
  onProgress?.(done, total);

  // Snapshot the live list of connections locally so parallel adds within this
  // scan also count as "existing" for dedup purposes.
  const snapshot = [...existingConnections];

  await pMap(
    tasks,
    async (t) => {
      try {
        const suggestions = await fetchSuggestedConnections({
          campaign: t.source.campaign,
          sourceEpisode: {
            episodeNum: t.source.episodeNum,
            title: t.source.title,
            summary: t.source.summary,
          },
          candidateEpisodes: t.candidates.map((e) => ({
            id: e.id,
            episodeNum: e.episodeNum,
            title: e.title,
            summary: e.summary,
          })),
        });
        const withSource = suggestions.map((s) => ({ fromEpisodeId: t.source.id, ...s }));
        const before = snapshot.length;
        applyConnections(snapshot, withSource, (conn) => {
          snapshot.push(conn);
          addConnection(conn);
        });

        // Mark every pair covered by this task as scanned — whether or not a
        // connection came back. Store per-campaign.
        const camp = t.source.campaign;
        const set = scannedByCamp.get(camp) || loadScannedPairs(camp);
        for (const c of t.candidates) set.add(pairKey(t.source.id, c.id));
        scannedByCamp.set(camp, set);

        return snapshot.length - before;
      } catch (err) {
        console.error("scanConnections task failed:", err);
        return 0;
      } finally {
        done += 1;
        onProgress?.(done, total);
      }
    },
    CONCURRENCY
  );

  // Persist the updated scanned-pair sets once at the end.
  for (const [camp, set] of scannedByCamp) saveScannedPairs(camp, set);

  return snapshot.length - existingConnections.length;
}
