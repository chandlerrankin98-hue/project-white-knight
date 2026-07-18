// Client helpers for the /api/character-info serverless proxy. Mirrors
// episodeInfo.js. Shared by the character auto-fill button (Add Character modal
// + character detail view).

const ENDPOINT = "/api/character-info";

// Is the proxy configured (ANTHROPIC_API_KEY set on the server)? Returns false
// on any error / unreachable endpoint so callers hide the UI.
export async function checkConfigured() {
  try {
    const r = await fetch(ENDPOINT);
    if (!r.ok) return false;
    const d = await r.json();
    return !!d.configured;
  } catch {
    return false;
  }
}

// Fetch auto-fill data for a character. `want` selects which fields to request.
// Returns { title, player, stats, notes } (any may be null). Throws on
// network/HTTP error so the caller can surface a message.
export async function fetchCharacterInfo({ campaign, name, want = ["title", "player", "stats", "notes"] }) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, name, want }),
  });
  if (!r.ok) throw new Error("Auto-fill request failed.");
  const d = await r.json();
  return {
    title: d.title ?? null,
    player: d.player ?? null,
    stats: d.stats ?? null,
    notes: d.notes ?? null,
  };
}
