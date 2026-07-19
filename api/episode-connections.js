// Vercel serverless function: suggests connections from a source episode to a
// shortlist of candidate episodes (both already logged by the user). Grounded
// in the Critical Role wiki. Sibling of episode-info.js / character-info.js.
//
// GET  -> { configured: boolean }
// POST -> { connections: [{ toEpisodeId, type, note }] }
//         body: {
//           campaign,
//           sourceEpisode:    { episodeNum, title, summary? },
//           candidateEpisodes:[{ id, episodeNum, title, summary? }, ...]
//         }
//
// Server-side guarantees:
// - Only returns connections whose `toEpisodeId` is in the input list.
// - Never returns self-links.
// - Coerces unknown connection types to "other".

const CAMPAIGN_SEARCH_NAMES = {
  c1: "Critical Role Campaign 1 (Vox Machina)",
  c2: "Critical Role Campaign 2 (Mighty Nein)",
  c3: "Critical Role Campaign 3 (Bells Hells)",
  c4: "Critical Role: Age of Umbra",
  other: "Critical Role one-shot",
};

const WIKI_BASE = "https://criticalrole.fandom.com/wiki/Critical_Role_Wiki";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const KNOWN_TYPES = new Set([
  "foreshadow",
  "callback",
  "plot-thread",
  "character-arc",
  "location",
  "other",
]);

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
    return res.status(503).json({ configured: false, connections: [] });
  }

  try {
    const { campaign, sourceEpisode, candidateEpisodes } = req.body || {};
    if (!sourceEpisode || !sourceEpisode.episodeNum) {
      return res.status(400).json({ error: "sourceEpisode with episodeNum is required" });
    }
    if (!Array.isArray(candidateEpisodes) || candidateEpisodes.length === 0) {
      return res.status(200).json({ connections: [] });
    }

    // Cap the shortlist to keep the prompt tight.
    const candidates = candidateEpisodes.slice(0, 40);
    const validIds = new Set(candidates.map((c) => c.id));

    const showName = CAMPAIGN_SEARCH_NAMES[campaign] || "Critical Role";

    const candidateLines = candidates
      .map(
        (c) =>
          `  - id="${c.id}" · E${c.episodeNum}${c.title ? ` "${c.title}"` : ""}${
            c.summary ? ` — ${String(c.summary).slice(0, 200)}` : ""
          }`
      )
      .join("\n");

    const prompt = `You are identifying story connections between a source episode of ${showName} and a shortlist of other already-logged episodes. Suggest connections ONLY to episodes in the shortlist (do not invent ids or episodes).

Source episode:
  E${sourceEpisode.episodeNum}${sourceEpisode.title ? ` "${sourceEpisode.title}"` : ""}${
      sourceEpisode.summary ? `\n  Summary: ${String(sourceEpisode.summary).slice(0, 500)}` : ""
    }

Candidate episodes (use these exact ids in your output):
${candidateLines}

Search the web to ground your judgments. Prefer the Critical Role Fandom wiki (${WIKI_BASE}).

Respond with ONLY a single JSON object (no markdown, no prose) of the form:
{"connections": [{"toEpisodeId": string, "type": string, "note": string}]}

Where:
- "toEpisodeId" is one of the candidate ids above.
- "type" is exactly one of: "foreshadow", "callback", "plot-thread", "character-arc", "location", "other".
- "note" is a short (<= 20 words) explanation of the connection.

Only include connections you are confident about, ideally 0-6 items. Do not fabricate. If unsure, return fewer or none.`;

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
      return res.status(502).json({ connections: [], error: "Upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    let connections = [];
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.connections)) {
          const seen = new Set();
          connections = parsed.connections
            .filter((c) => c && typeof c.toEpisodeId === "string" && validIds.has(c.toEpisodeId))
            .map((c) => ({
              toEpisodeId: c.toEpisodeId,
              type: KNOWN_TYPES.has(c.type) ? c.type : "other",
              note: typeof c.note === "string" ? c.note.trim().slice(0, 240) : "",
            }))
            // Dedup by target+type within a single response.
            .filter((c) => {
              const key = `${c.toEpisodeId}::${c.type}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        }
      } catch {
        // leave empty
      }
    }

    return res.status(200).json({ connections });
  } catch (err) {
    console.error("episode-connections failed:", err);
    return res.status(500).json({ connections: [], error: "Internal error" });
  }
}
