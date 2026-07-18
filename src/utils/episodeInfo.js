// Client helpers for the /api/episode-info serverless proxy. Shared by the
// auto-fill button wherever it appears (Add Episode modal + episode cards).

const ENDPOINT = "/api/episode-info";

// Is the proxy configured (i.e. is ANTHROPIC_API_KEY set on the server)?
// Returns false on any error / unreachable endpoint so callers hide the UI.
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

// Fetch auto-fill data for an episode. `want` selects which fields to request.
// Returns { url, summary } (either may be null). Throws on network/HTTP error
// so the caller can surface a message.
export async function fetchEpisodeInfo({ campaign, episodeNum, title, want = ["url", "summary"] }) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, episodeNum, title, want }),
  });
  if (!r.ok) throw new Error("Auto-fill request failed.");
  const d = await r.json();
  return { url: d.url ?? null, summary: d.summary ?? null };
}
