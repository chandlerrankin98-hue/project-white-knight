// Persistence layer for the tracker.
//
// The original artifact used `window.storage.get/set` (a Claude-artifact API)
// under a single key holding `{ episodes, characters, events }`. Here we use
// real browser localStorage and add a versioned schema so we can migrate old
// blobs forward as the data model grows.

const STORAGE_KEY = "cr-tracker-data";
export const CURRENT_VERSION = 4;

// Default fields for a character. Spread FIRST so existing values win, letting
// migrations and creation backfill only what's missing.
export const CHARACTER_DEFAULTS = {
  stats: "",
  firstEpisode: "",
  introInfo: "",
  spoilerInfo: "",
  spoilerRevealedEpisode: null,
};

export function emptyData() {
  return {
    version: CURRENT_VERSION,
    episodes: [],
    characters: [],
    events: [],
    connections: [],
  };
}

// Bring any older blob up to the current schema shape. Each step is additive so
// existing user data is never dropped.
export function migrate(raw) {
  if (!raw || typeof raw !== "object") return emptyData();

  let data = { ...raw };

  // v1 (unversioned): { episodes, characters, events } with no summary/connections.
  if (!data.version) {
    data = {
      ...data,
      version: 2,
      episodes: (data.episodes || []).map((ep) => ({ summary: "", ...ep })),
      connections: data.connections || [],
    };
  }

  // Backfill any missing top-level arrays and per-record fields defensively,
  // regardless of the version we started from. v3 added `stats`; v4 adds the
  // tiered spoiler fields (firstEpisode / introInfo / spoilerInfo /
  // spoilerRevealedEpisode) to characters.
  return {
    version: CURRENT_VERSION,
    episodes: (data.episodes || []).map((ep) => ({ summary: "", ...ep })),
    characters: (data.characters || []).map((ch) => ({ ...CHARACTER_DEFAULTS, ...ch })),
    events: data.events || [],
    connections: data.connections || [],
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.error("Failed to load tracker data, starting fresh:", err);
    return emptyData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save tracker data:", err);
  }
}

// --- Export / import (the cross-device safety net) ---

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `critical-role-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Parse and validate an imported JSON string, returning migrated data.
// Throws if the payload is not a recognizable tracker export.
export function parseImport(text) {
  const parsed = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (!Array.isArray(parsed.episodes) && !Array.isArray(parsed.characters))
  ) {
    throw new Error("This file doesn't look like a tracker export.");
  }
  return migrate(parsed);
}
