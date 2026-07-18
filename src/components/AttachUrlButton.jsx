import { useState } from "react";
import { Sparkles, Loader } from "lucide-react";
import { campaignById } from "../constants.js";

// NOTE: for now this calls the Anthropic API directly (as the original artifact
// did). Step 9 of the plan rewires it to POST /api/find-episode-url so the key
// stays server-side and CORS works from a deployed origin.
export default function AttachUrlButton({ campaign, episode, onAttach }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const camp = campaignById(campaign.id);
      const prompt = `Find the official YouTube video URL for "${camp.searchName}" Episode ${episode.episodeNum}${
        episode.title ? ` titled "${episode.title}"` : ""
      }. Search the web. Return ONLY a single YouTube URL (https://www.youtube.com/watch?v=...) and nothing else. If you can't find a confident match, return exactly: NOT_FOUND`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      });

      const data = await response.json();
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(" ")
        .trim();

      const urlMatch = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/);
      if (urlMatch) {
        onAttach(urlMatch[0]);
      } else {
        setError("Couldn't find it — try the search button instead.");
      }
    } catch (e) {
      setError("Auto-find failed. Try the search button.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Searching..." : "Auto-fetch URL"}
      </button>
      {error && <span className="text-rose-400/80 text-[10px] mt-1">{error}</span>}
    </div>
  );
}
