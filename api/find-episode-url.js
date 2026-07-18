// Vercel serverless function: proxies the Anthropic API so the key stays
// server-side and the browser isn't blocked by CORS.
//
// GET  -> { configured: boolean }         (used by the UI to show/hide the button)
// POST -> { url: string | null }           body: { campaign, episodeNum, title }
//
// Set ANTHROPIC_API_KEY in the Vercel project's environment variables. If it is
// missing, GET reports configured:false and the UI hides the auto-fetch button;
// the manual paste field still works, so the app stays fully usable.

const CAMPAIGN_SEARCH_NAMES = {
  c1: "Critical Role Campaign 1",
  c2: "Critical Role Campaign 2",
  c3: "Critical Role Campaign 3",
  c4: "Critical Role Age of Umbra",
  other: "Critical Role one-shot",
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
    return res.status(503).json({ configured: false, url: null });
  }

  try {
    const { campaign, episodeNum, title } = req.body || {};
    if (!episodeNum) {
      return res.status(400).json({ error: "episodeNum is required" });
    }

    const searchName = CAMPAIGN_SEARCH_NAMES[campaign] || "Critical Role";
    const prompt = `Find the official YouTube video URL for "${searchName}" Episode ${episodeNum}${
      title ? ` titled "${title}"` : ""
    }. Search the web. Return ONLY a single YouTube URL (https://www.youtube.com/watch?v=...) and nothing else. If you can't find a confident match, return exactly: NOT_FOUND`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Anthropic API error:", response.status, detail);
      return res.status(502).json({ url: null, error: "Upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    const urlMatch = text.match(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
    );
    return res.status(200).json({ url: urlMatch ? urlMatch[0] : null });
  } catch (err) {
    console.error("find-episode-url failed:", err);
    return res.status(500).json({ url: null, error: "Internal error" });
  }
}
