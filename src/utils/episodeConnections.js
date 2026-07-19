// Client helper for the /api/episode-connections proxy (auto-detect
// connections). Mirrors the other *Info helpers.

const ENDPOINT = "/api/episode-connections";

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

// Returns [{ toEpisodeId, type, note }]. Throws on network/HTTP error.
export async function fetchSuggestedConnections({ campaign, sourceEpisode, candidateEpisodes }) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, sourceEpisode, candidateEpisodes }),
  });
  if (!r.ok) throw new Error("Connection lookup failed.");
  const d = await r.json();
  return Array.isArray(d.connections) ? d.connections : [];
}
