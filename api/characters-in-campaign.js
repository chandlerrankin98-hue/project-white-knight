// Vercel serverless function: lists the main characters introduced in a campaign
// up to a given episode, for the bulk "auto-add characters up to E#" action.
// Sibling of episode-info.js / character-info.js.
//
// GET  -> { configured: boolean }
// POST { campaign, uptoEpisode } -> { characters: [{ name, firstEpisode, introInfo }] }
//
// Spoiler-safe: only introduction-time identity, no later reveals.

const CAMPAIGN_SEARCH_NAMES = {
  c1: "Critical Role Campaign 1 (Vox Machina)",
  c2: "Critical Role Campaign 2 (Mighty Nein)",
  c3: "Critical Role Campaign 3 (Bells Hells)",
  c4: "Critical Role: Age of Umbra",
  other: "Critical Role one-shot",
};

const WIKI_BASE = "https://criticalrole.fandom.com/wiki/Critical_Role_Wiki";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (req.method === "GET") {
    return res.status(200).json({ configured: !!apiKey });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!apiKey) {
    return res.status(503).json({ configured: false, characters: [] });
  }

  try {
    const { campaign, uptoEpisode } = req.body || {};
    const upto = parseInt(uptoEpisode, 10);
    if (!Number.isFinite(upto) || upto <= 0) {
      return res.status(400).json({ error: "uptoEpisode (positive integer) is required" });
    }

    const showName = CAMPAIGN_SEARCH_NAMES[campaign] || "Critical Role";
    const prompt = `List the main and notable recurring characters in ${showName} who are FIRST introduced at or before Episode ${upto}.

Search the web. Prefer the Critical Role Fandom wiki (${WIKI_BASE}); fall back to official Critical Role sources.

Respond with ONLY a single JSON object (no markdown, no prose) of the form:
{"characters": [{"name": string, "firstEpisode": integer, "introInfo": string}]}

Where:
- "name" is the character's name.
- "firstEpisode" is the episode number they first appear (must be <= ${upto}).
- "introInfo" is a ONE-sentence SPOILER-SAFE description of who they appear to be at introduction — no later plot twists, hidden identities, or reveals.

Only include characters actually introduced by Episode ${upto}. Do not invent characters or episode numbers. Limit to the ~15 most significant. If unsure, return fewer.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Anthropic API error:", response.status, detail);
      return res.status(502).json({ characters: [], error: "Upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    let characters = [];
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.characters)) {
          characters = parsed.characters
            .filter((c) => c && typeof c.name === "string" && c.name.trim())
            .map((c) => {
              const fe = parseInt(c.firstEpisode, 10);
              return {
                name: c.name.trim(),
                firstEpisode: Number.isFinite(fe) && fe > 0 ? fe : null,
                introInfo: typeof c.introInfo === "string" ? c.introInfo.trim() : "",
              };
            })
            // Keep only those actually introduced by the boundary (or unknown).
            .filter((c) => c.firstEpisode == null || c.firstEpisode <= upto);
        }
      } catch {
        // leave empty
      }
    }

    return res.status(200).json({ characters });
  } catch (err) {
    console.error("characters-in-campaign failed:", err);
    return res.status(500).json({ characters: [], error: "Internal error" });
  }
}
