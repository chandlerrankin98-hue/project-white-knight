// Bidirectional connection scan: for each "new" episode, ask the AI which
// connections link it to every other logged episode in the same campaign.
//
// Called after Save (single episode) and after batch-Save (multiple episodes).
// Runs the fetches in parallel with a small concurrency cap so a large campaign
// doesn't hammer the endpoint or Vercel's function budget. Uses the shared
// applyConnections dedup helper so identical links across passes never double.

import { fetchSuggestedConnections } from "./episodeConnections.js";
import { applyConnections } from "./applyConnections.js";

const CONCURRENCY = 4;
const MAX_PEERS = 20; // per-new-episode inward-scan cap

// Run `worker(item)` on each item with at most `limit` in flight.
async function pMap(items, worker, limit) {
  const out = new Array(items.length);
  let i = 0;
  async function next() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { out[idx] = await worker(items[idx], idx); }
      catch (e) { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return out;
}

// newEpisodes: episodes just added (each: { id, campaign, episodeNum, title, summary })
// allEpisodes: full episode list AFTER the new ones were added (so peers include batch-mates)
// existingConnections: current connections snapshot (deduplicates against them)
// addConnection: CRUD from useTrackerData
// onProgress: optional (done, total) => void for progress toasts
// Returns total number of connections added across all scans.
export async function scanConnectionsForNewEpisodes({
  newEpisodes,
  allEpisodes,
  existingConnections,
  addConnection,
  onProgress,
}) {
  if (!newEpisodes.length) return 0;

  // Build the per-scan work list: for each new episode, one "outward" pass
  // (source = new, candidates = every other same-campaign episode) plus one
  // "inward" pass per peer (source = peer, candidates = [new]) — capped.
  const tasks = [];
  for (const nEp of newEpisodes) {
    const peers = allEpisodes.filter(
      (e) => e.campaign === nEp.campaign && e.id !== nEp.id
    );
    if (peers.length === 0) continue;

    // Outward
    tasks.push({
      kind: "outward",
      sourceEp: nEp,
      candidates: peers,
    });
    // Inward (each peer -> new episode, capped)
    for (const peer of peers.slice(0, MAX_PEERS)) {
      tasks.push({
        kind: "inward",
        sourceEp: peer,
        candidates: [nEp],
      });
    }
  }

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
          campaign: t.sourceEp.campaign,
          sourceEpisode: {
            episodeNum: t.sourceEp.episodeNum,
            title: t.sourceEp.title,
            summary: t.sourceEp.summary,
          },
          candidateEpisodes: t.candidates.map((e) => ({
            id: e.id,
            episodeNum: e.episodeNum,
            title: e.title,
            summary: e.summary,
          })),
        });
        const withSource = suggestions.map((s) => ({ fromEpisodeId: t.sourceEp.id, ...s }));
        const before = snapshot.length;
        applyConnections(snapshot, withSource, (conn) => {
          snapshot.push(conn); // keep local snapshot in sync for dedup
          addConnection(conn);
        });
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

  return snapshot.length - existingConnections.length;
}
