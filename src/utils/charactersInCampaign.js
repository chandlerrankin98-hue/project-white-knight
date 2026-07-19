// Client helper for the /api/characters-in-campaign proxy (bulk "auto-add
// characters up to E#"). Mirrors the other *Info helpers.

const ENDPOINT = "/api/characters-in-campaign";

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

// Returns { characters: [{ name, firstEpisode, introInfo }] }. Throws on
// network/HTTP error.
export async function fetchCampaignCharacters({ campaign, uptoEpisode }) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, uptoEpisode }),
  });
  if (!r.ok) throw new Error("Character lookup failed.");
  const d = await r.json();
  return Array.isArray(d.characters) ? d.characters : [];
}
