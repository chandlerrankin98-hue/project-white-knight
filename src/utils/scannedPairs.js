// Tracks which pairs of episodes the connection scan has visited, per campaign,
// so the backfill only spends AI calls on pairs that were never scanned. This
// is a UI preference / cache — not tracker data — so it lives in localStorage
// and doesn't need a schema migration. If the user clears storage they just
// pay to re-scan; nothing critical is lost.

const KEY = (campaign) => `cr-scanned-pairs:${campaign}`;

// Canonical pair key: episode ids sorted so (a,b) === (b,a).
export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function loadScannedPairs(campaign) {
  try {
    const raw = localStorage.getItem(KEY(campaign));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveScannedPairs(campaign, set) {
  try {
    localStorage.setItem(KEY(campaign), JSON.stringify([...set]));
  } catch {
    // localStorage full / disabled — silently drop; the worst case is a
    // duplicate scan next time, which the applyConnections dedup absorbs.
  }
}
