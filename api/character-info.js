// Vercel serverless function: proxies the Anthropic API (keeps the key
// server-side, avoids browser CORS) to auto-populate a character's details from
// just their name + campaign. Sibling of api/episode-info.js.
//
// GET  -> { configured: boolean }
// POST -> { title, player, stats, notes }  (any field may be null)
//         body: { campaign, name, want?: ["title","player","stats","notes"] }
//
// Set ANTHROPIC_API_KEY in Vercel's environment variables. If it's missing, GET
// reports configured:false and the UI hides the auto-fill button; manual entry
// still works.

const CAMPAIGN_SEARCH_NAMES = {
  c1: "Critical Role Campaign 1 (Vox Machina)",
  c2: "Critical Role Campaign 2 (Mighty Nein)",
  c3: "Critical Role Campaign 3 (Bells Hells)",
  c4: "Critical Role: Age of Umbra",
  other: "Critical Role one-shot",
};

// Primary grounding source — character pages carry class/race and stat details.
const WIKI_BASE = "https://criticalrole.fandom.com/wiki/Critical_Role_Wiki";

// Model to use. Overridable via env var so a retired model ID can be swapped
// without a code change. Default is a current, generally-available model.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const FIELD_INSTRUCTIONS = {
  title: `- "title": a short race + class/role line (e.g. "Human Sorcerer (Storm)" or "NPC — Ruby of the Sea"). Null if unknown.`,
  player: `- "player": the real-world player's name (e.g. "Laura Bailey"). Null if this is an NPC or unknown.`,
  stats: `- "stats": a concise freeform stat block as plain text with line breaks — include race, class & subclass, level if known, ability scores (STR/DEX/CON/INT/WIS/CHA) if publicly documented, and a few notable skills/abilities. Only include what is actually documented; do not invent numbers. Null if nothing is known.`,
  notes: `- "notes": a 2-3 sentence spoiler-light background/bio. Null if unknown.`,
};

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
    return res
      .status(503)
      .json({ configured: false, title: null, player: null, stats: null, notes: null });
  }

  try {
    const { campaign, name, want } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const fields = Array.isArray(want) && want.length
      ? want.filter((f) => FIELD_INSTRUCTIONS[f])
      : ["title", "player", "stats", "notes"];
    if (!fields.length) {
      return res.status(400).json({ error: "no valid fields requested" });
    }

    const showName = CAMPAIGN_SEARCH_NAMES[campaign] || "Critical Role";
    const prompt = `You are helping fill in details for the character "${name}" from ${showName}.

Search the web to find accurate information. Prefer the Critical Role Fandom wiki as your primary source (${WIKI_BASE} — character pages carry class/race and, where public, stat details); fall back to official Critical Role sources.

Then respond with ONLY a single JSON object (no markdown, no prose around it) with these fields:
${fields.map((f) => FIELD_INSTRUCTIONS[f]).join("\n")}

Only include information that is actually documented — never fabricate stats or a player. Set any field you can't determine confidently to null.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Anthropic API error:", response.status, detail);
      return res
        .status(502)
        .json({ title: null, player: null, stats: null, notes: null, error: "Upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    const out = { title: null, player: null, stats: null, notes: null };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const f of fields) {
          if (typeof parsed[f] === "string" && parsed[f].trim()) {
            out[f] = parsed[f].trim();
          }
        }
      } catch {
        // leave nulls; the client surfaces "couldn't find" if all null
      }
    }

    // Only return the requested fields (others stay null).
    return res.status(200).json({
      title: fields.includes("title") ? out.title : null,
      player: fields.includes("player") ? out.player : null,
      stats: fields.includes("stats") ? out.stats : null,
      notes: fields.includes("notes") ? out.notes : null,
    });
  } catch (err) {
    console.error("character-info failed:", err);
    return res
      .status(500)
      .json({ title: null, player: null, stats: null, notes: null, error: "Internal error" });
  }
}
