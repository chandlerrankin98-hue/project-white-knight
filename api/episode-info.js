// Vercel serverless function: proxies the Anthropic API (keeps the key
// server-side, avoids browser CORS) to auto-fill episode info from just the
// episode number + campaign.
//
// GET  -> { configured: boolean }   (used by the UI to show/hide the auto-fill button)
// POST -> { url: string|null, summary: string|null }
//         body: { campaign, episodeNum, title, want?: ["url","summary"] }
//
// Set ANTHROPIC_API_KEY in the Vercel project's environment variables. If it is
// missing, GET reports configured:false and the UI hides the auto-fill button;
// the manual paste/summary fields still work, so the app stays fully usable.

const CAMPAIGN_SEARCH_NAMES = {
  c1: "Critical Role Campaign 1 (Vox Machina)",
  c2: "Critical Role Campaign 2 (Mighty Nein)",
  c3: "Critical Role Campaign 3 (Bells Hells)",
  c4: "Critical Role: Age of Umbra",
  other: "Critical Role one-shot",
};

// Primary grounding source; the deferred character endpoint reuses this.
const WIKI_BASE = "https://criticalrole.fandom.com/wiki/Critical_Role_Wiki";

// Model to use. Overridable via env var so a retired model ID can be swapped
// without a code change. Default is a current, generally-available model.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const YT_URL_RE =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;

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
    return res.status(503).json({ configured: false, url: null, summary: null });
  }

  try {
    const { campaign, episodeNum, title, want } = req.body || {};
    if (!episodeNum) {
      return res.status(400).json({ error: "episodeNum is required" });
    }
    const wants = Array.isArray(want) && want.length ? want : ["url", "summary"];
    const wantUrl = wants.includes("url");
    const wantSummary = wants.includes("summary");

    const searchName = CAMPAIGN_SEARCH_NAMES[campaign] || "Critical Role";
    const tasks = [];
    if (wantSummary) {
      tasks.push(
        `- "summary": a concise 3-5 sentence recap of what happened in the episode (key plot events, no meta commentary).`
      );
    }
    if (wantUrl) {
      tasks.push(
        `- "url": the official full-episode YouTube URL (https://www.youtube.com/watch?v=...), or null if you can't find a confident match.`
      );
    }

    const prompt = `You are helping fill in details for ${searchName} Episode ${episodeNum}${
      title ? ` titled "${title}"` : ""
    }.

Search the web to find accurate information. Prefer the Critical Role Fandom wiki as your primary source (${WIKI_BASE} — episode pages there carry synopses); fall back to CritRoleStats or official Critical Role recaps.

Then respond with ONLY a single JSON object (no markdown, no prose around it) with these fields:
${tasks.join("\n")}

If a field can't be determined confidently, set it to null.`;

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
      return res.status(502).json({ url: null, summary: null, error: "Upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    // Primary: parse the JSON object the model was asked to return.
    let url = null;
    let summary = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.url === "string") url = parsed.url;
        if (typeof parsed.summary === "string") summary = parsed.summary.trim();
      } catch {
        // fall through to regex fallback
      }
    }

    // Fallback: if JSON parsing failed to produce a URL, regex-extract one.
    if (wantUrl && !url) {
      const m = text.match(YT_URL_RE);
      if (m) url = m[0];
    }
    // Validate the URL actually looks like YouTube.
    if (url && !YT_URL_RE.test(url)) url = null;

    return res.status(200).json({
      url: wantUrl ? url : null,
      summary: wantSummary ? summary : null,
    });
  } catch (err) {
    console.error("episode-info failed:", err);
    return res.status(500).json({ url: null, summary: null, error: "Internal error" });
  }
}
