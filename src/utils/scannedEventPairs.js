// Tracks which (character, episode) pairs the event scanner has already
// visited, per campaign, so the events backfill only spends AI calls on pairs
// that were never scanned. Mirrors scannedPairs.js in shape.
//
// Not tracker data — lives in localStorage and doesn't need a schema
// migration. If cleared, we just pay to re-scan; nothing critical is lost.

const KEY = (campaign) => `cr-scanned-event-pairs:${campaign}`;

export function eventPairKey(characterId, episodeId) {
  return `${characterId}|${episodeId}`;
}

export function loadScannedEventPairs(campaign) {
  try {
    const raw = localStorage.getItem(KEY(campaign));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveScannedEventPairs(campaign, set) {
  try {
    localStorage.setItem(KEY(campaign), JSON.stringify([...set]));
  } catch {
    // localStorage full / disabled — harmless; scan may repeat next time.
  }
}
