import { useState, useEffect } from "react";
import { Sparkles, Loader } from "lucide-react";

// Auto-fetches an episode's official YouTube URL via the /api/find-episode-url
// serverless proxy (keeps the Anthropic key server-side). The button hides
// itself when the proxy reports it isn't configured (no ANTHROPIC_API_KEY) or
// isn't reachable at all — the manual paste field still covers that case.
export default function AttachUrlButton({ campaign, episode, onAttach }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/find-episode-url")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => { if (!cancelled) setAvailable(!!d.configured); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/find-episode-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: campaign.id,
          episodeNum: episode.episodeNum,
          title: episode.title,
        }),
      });
      const data = await response.json();
      if (data.url) {
        onAttach(data.url);
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
