// Post-save event scanner: fills in timeline events for tracked characters
// across newly-added episodes AND, as a backfill, older episodes whose
// (character, episode) pairs were never scanned before.
//
// Only writes events for characters that the user already has in the tracker
// (spoiler-safe — won't invent NPCs). Groups requests by EPISODE so one API
// call covers many characters for that episode.

import { fetchEpisodeInfo } from "./episodeInfo.js";
import { eventPairKey, loadScannedEventPairs, saveScannedEventPairs } from "./scannedEventPairs.js";

const CONCURRENCY = 4;
// Per-save cap on how many EPISODES we scan for events at once. Whatever's
// left picks up on subsequent saves.
const MAX_EPISODES_PER_SAVE = 25;

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

// newEpisodes: episodes just added.
// allEpisodes: full episode list AFTER the new ones.
// characters: current tracker characters (any campaign).
// existingEvents: current events snapshot.
// addEvent: CRUD from useTrackerData.
// onProgress: optional (done, total) => void for progress toasts.
// Returns number of events actually added.
export async function scanEventsForNewEpisodes({
  newEpisodes,
  allEpisodes,
  characters,
  existingEvents,
  addEvent,
  onProgress,
}) {
  if (!newEpisodes.length || !characters.length) return 0;

  const campaigns = new Set(newEpisodes.map((e) => e.campaign));

  // Load scanned sets per campaign.
  const scannedByCamp = new Map();
  for (const c of campaigns) scannedByCamp.set(c, loadScannedEventPairs(c));

  // Build tasks: one per episode that has at least one unscanned tracked-char pair.
  // Priority: new episodes first, then older (backfill).
  let episodesBudget = MAX_EPISODES_PER_SAVE;
  const tasks = [];
  for (const camp of campaigns) {
    if (episodesBudget <= 0) break;
    const chars = characters.filter((c) => c.campaign === camp);
    if (!chars.length) continue;
    const scanned = scannedByCamp.get(camp);
    const inCamp = allEpisodes.filter((e) => e.campaign === camp);
    const newIds = new Set(newEpisodes.filter((e) => e.campaign === camp).map((e) => e.id));
    const ordered = [
      ...inCamp.filter((e) => newIds.has(e.id)),
      ...inCamp.filter((e) => !newIds.has(e.id)),
    ];

    for (const ep of ordered) {
      if (episodesBudget <= 0) break;
      const needed = chars.filter((ch) => {
        const k = eventPairKey(ch.id, ep.id);
        if (scanned.has(k)) return false;
        // If any event already exists for this pair, treat it as covered.
        if (existingEvents.some((ev) => ev.characterId === ch.id && ev.episodeId === ep.id)) return false;
        return true;
      });
      if (!needed.length) continue;
      tasks.push({ episode: ep, chars: needed });
      episodesBudget -= 1;
    }
  }

  if (!tasks.length) return 0;

  const total = tasks.length;
  let done = 0;
  onProgress?.(done, total);

  // Local snapshot so parallel adds within this scan also block duplicates.
  const snapshotEvents = [...existingEvents];

  await pMap(
    tasks,
    async (t) => {
      try {
        const result = await fetchEpisodeInfo({
          campaign: t.episode.campaign,
          episodeNum: t.episode.episodeNum,
          title: t.episode.title,
          want: ["events"],
          characterNames: t.chars.map((c) => c.name),
        });
        const returnedEvents = Array.isArray(result.events) ? result.events : [];
        const nameToChar = new Map(
          t.chars.map((c) => [c.name.trim().toLowerCase(), c])
        );
        for (const ev of returnedEvents) {
          const ch = nameToChar.get((ev.characterName || "").trim().toLowerCase());
          if (!ch) continue;
          const description = (ev.description || "").trim();
          if (!description) continue;
          if (snapshotEvents.some((e) => e.characterId === ch.id && e.episodeId === t.episode.id)) continue;
          const created = { characterId: ch.id, episodeId: t.episode.id, description };
          snapshotEvents.push(created);
          addEvent(created);
        }
        // Mark every requested (char, episode) pair as scanned regardless of AI output.
        const camp = t.episode.campaign;
        const set = scannedByCamp.get(camp) || loadScannedEventPairs(camp);
        for (const ch of t.chars) set.add(eventPairKey(ch.id, t.episode.id));
        scannedByCamp.set(camp, set);
      } catch (err) {
        console.error("scanEvents task failed:", err);
      } finally {
        done += 1;
        onProgress?.(done, total);
      }
    },
    CONCURRENCY
  );

  for (const [camp, set] of scannedByCamp) saveScannedEventPairs(camp, set);
  return snapshotEvents.length - existingEvents.length;
}
