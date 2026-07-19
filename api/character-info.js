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

// Each field: prompt instruction + how to coerce the parsed JSON value.
const asString = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const asEpisodeNum = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const FIELDS = {
  title: {
    instruction: `- "title": a short race + class/role line (e.g. "Human Sorcerer (Storm)" or "NPC — Ruby of the Sea"). Null if unknown.`,
    coerce: asString,
  },
  player: {
    instruction: `- "player": the real-world player's name (e.g. "Laura Bailey"). Null if this is an NPC or unknown.`,
    coerce: asString,
  },
  stats: {
    instruction: `- "stats": a concise freeform stat block as plain text with line breaks — include race, class & subclass, level if known, ability scores (STR/DEX/CON/INT/WIS/CHA) if publicly documented, and a few notable skills/abilities. Only include what is actually documented; do not invent numbers. Null if nothing is known.`,
    coerce: asString,
  },
  firstEpisode: {
    instruction: `- "firstEpisode": the episode NUMBER (integer) in which this character first appears / is introduced in this campaign. Null if unknown.`,
    coerce: asEpisodeNum,
  },
  introInfo: {
    instruction: `- "introInfo": a spoiler-SAFE description of who this character appears to be WHEN THEY ARE FIRST INTRODUCED — surface identity, role, and first impression only. Absolutely no later plot twists, hidden identities, or backstory revealed later. 2-3 sentences. Null if unknown.`,
    coerce: asString,
  },
  spoilerInfo: {
    instruction: `- "spoilerInfo": the SPOILER tier — the character's true backstory, hidden identity, and how they fit into the campaign's larger plot, i.e. things REVEALED LATER (not known at introduction). 2-4 sentences. Null if there are no notable later revelations.`,
    coerce: asString,
  },
  spoilerRevealedEpisode: {
    instruction: `- "spoilerRevealedEpisode": the episode NUMBER (integer) by which the spoilerInfo above has been revealed in the campaign. Best effort; null if you cannot determine it confidently. When null, the app keeps the spoiler hidden until manually revealed, so do not guess.`,
    coerce: asEpisodeNum,
  },
  notes: {
    instruction: `- "notes": a 2-3 sentence spoiler-light general note. Null if unknown.`,
    coerce: asString,
  },
};

const DEFAULT_FIELDS = [
  "title",
  "player",
  "stats",
  "firstEpisode",
  "introInfo",
  "spoilerInfo",
  "spoilerRevealedEpisode",
];

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (req.method === "GET") {
    return res.status(200).json({ configured: !!apiKey });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Build a null-filled response for every known field (used on error paths).
  const emptyResult = () =>
    Object.fromEntries(Object.keys(FIELDS).map((f) => [f, null]));

  if (!apiKey) {
    return res.status(503).json({ configured: false, ...emptyResult() });
  }

  try {
    const { campaign, name, want } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const fields = Array.isArray(want) && want.length
      ? want.filter((f) => FIELDS[f])
      : DEFAULT_FIELDS;
    if (!fields.length) {
      return res.status(400).json({ error: "no valid fields requested" });
    }

    const showName = CAMPAIGN_SEARCH_NAMES[campaign] || "Critical Role";
    const prompt = `You are helping fill in details for the character "${name}" from ${showName}.

Search the web to find accurate information. Prefer the Critical Role Fandom wiki as your primary source (${WIKI_BASE} — character pages carry class/race and, where public, stat details); fall back to official Critical Role sources.

IMPORTANT — keep introduction-time facts separate from later spoilers: "introInfo" must contain ONLY what a viewer knows when the character is first introduced, and "spoilerInfo" holds revelations that come later. Do not leak later reveals into introInfo.

Then respond with ONLY a single JSON object (no markdown, no prose around it) with these fields:
${fields.map((f) => FIELDS[f].instruction).join("\n")}

Only include information that is actually documented — never fabricate facts, stats, a player, or a reveal episode. Set any field you can't determine confidently to null.`;

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
      return res.status(502).json({ ...emptyResult(), error: "Upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    // Start all-null; fill only the requested fields, coerced to their type.
    const out = emptyResult();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const f of fields) {
          if (parsed[f] != null) out[f] = FIELDS[f].coerce(parsed[f]);
        }
      } catch {
        // leave nulls; the client surfaces "couldn't find" if all null
      }
    }

    // Guard: a reveal episode without spoiler text is meaningless.
    if (!out.spoilerInfo) out.spoilerRevealedEpisode = null;

    return res.status(200).json(out);
  } catch (err) {
    console.error("character-info failed:", err);
    return res.status(500).json({ ...emptyResult(), error: "Internal error" });
  }
}
