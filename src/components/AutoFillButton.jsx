import { useState, useEffect } from "react";
import { Sparkles, Loader, Check, X, Youtube } from "lucide-react";
import { checkConfigured, fetchEpisodeInfo } from "../utils/episodeInfo.js";

// Auto-fills an episode's summary and/or YouTube URL from the /api/episode-info
// proxy (web search grounded in the Critical Role wiki). Preview-then-accept:
// fetched values are shown for review and only applied on an explicit tap, so
// nothing overwrites existing text silently. Hides itself when the proxy isn't
// configured (no ANTHROPIC_API_KEY) or is unreachable — manual entry still works.
export default function AutoFillButton({
  campaign,
  episodeNum,
  title,
  want = ["url", "summary"],
  onApply,
  label = "Auto-fill",
}) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { url, summary }

  useEffect(() => {
    let cancelled = false;
    checkConfigured().then((c) => { if (!cancelled) setAvailable(c); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  const disabled = loading || !episodeNum;

  const run = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await fetchEpisodeInfo({
        campaign: campaign.id,
        episodeNum,
        title,
        want,
      });
      if (!result.url && !result.summary) {
        setError("Couldn't find details — try again or fill it in manually.");
      } else {
        setPreview(result);
      }
    } catch (e) {
      setError("Auto-fill failed. Check your connection or fill in manually.");
    }
    setLoading(false);
  };

  const apply = (fields) => {
    onApply(fields);
    setPreview(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={disabled}
        title={!episodeNum ? "Enter an episode number first" : undefined}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed self-start"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Searching..." : label}
      </button>

      {error && <span className="text-rose-400/80 text-[10px]">{error}</span>}

      {preview && (
        <div className="mt-1 bg-[#0f0a14] border border-amber-500/30 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-amber-300/80 text-[10px] tracking-widest uppercase font-display">
              Suggested
            </span>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-amber-200/60 hover:text-amber-100"
              aria-label="Discard suggestion"
            >
              <X size={14} />
            </button>
          </div>

          {preview.summary && (
            <p className="text-amber-100/85 whitespace-pre-wrap leading-relaxed mb-2">
              {preview.summary}
            </p>
          )}
          {preview.url && (
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 text-xs mb-2"
            >
              <Youtube size={13} /> Video found
            </a>
          )}

          <div className="flex flex-wrap gap-2 mt-1">
            {preview.summary && preview.url && (
              <button
                type="button"
                onClick={() => apply({ summary: preview.summary, url: preview.url })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-xs font-semibold"
              >
                <Check size={12} /> Accept both
              </button>
            )}
            {preview.summary && (
              <button
                type="button"
                onClick={() => apply({ summary: preview.summary })}
                className="px-2.5 py-1.5 rounded border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/10"
              >
                Accept summary
              </button>
            )}
            {preview.url && (
              <button
                type="button"
                onClick={() => apply({ url: preview.url })}
                className="px-2.5 py-1.5 rounded border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/10"
              >
                Accept URL
              </button>
            )}
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="px-2.5 py-1.5 rounded text-amber-200/50 text-xs hover:text-amber-200"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
