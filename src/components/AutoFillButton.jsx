import { useState, useEffect } from "react";
import { Sparkles, Loader, Check, X, Youtube, UserPlus } from "lucide-react";
import { checkConfigured, fetchEpisodeInfo } from "../utils/episodeInfo.js";

// Auto-fills an episode's title, summary, and YouTube URL from the
// /api/episode-info proxy (web search grounded in the Critical Role wiki), and
// can surface characters introduced in the episode for one-tap adding.
// Preview-then-accept: fetched values are only applied on an explicit tap.
// Hides itself when the proxy isn't configured or is unreachable.
export default function AutoFillButton({
  campaign,
  episodeNum,
  title,
  want = ["url", "summary", "title", "characters"],
  onApply,
  onAddCharacters, // optional: (chars[]) => void — enables the "introduced" list
  label = "Auto-fill",
}) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { url, summary, title, characters }
  const [addedChars, setAddedChars] = useState(() => new Set());

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
    setAddedChars(new Set());
    try {
      const result = await fetchEpisodeInfo({ campaign: campaign.id, episodeNum, title, want });
      if (!result.url && !result.summary && !result.title && !(result.characters || []).length) {
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

  const addChar = (c) => {
    onAddCharacters?.([{ ...c, firstEpisode: episodeNum }]);
    setAddedChars((prev) => new Set(prev).add(c.name));
  };
  const addAllChars = () => {
    const remaining = (preview.characters || []).filter((c) => !addedChars.has(c.name));
    if (remaining.length) onAddCharacters?.(remaining.map((c) => ({ ...c, firstEpisode: episodeNum })));
    setAddedChars(new Set((preview.characters || []).map((c) => c.name)));
  };

  const chars = onAddCharacters ? preview?.characters || [] : [];
  // "Accept all" only covers the text fields, not the character adds.
  const textFields = preview
    ? Object.fromEntries(
        [["title", preview.title], ["summary", preview.summary], ["url", preview.url]].filter(
          ([, v]) => v
        )
      )
    : {};
  const textFieldCount = Object.keys(textFields).length;

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

          {preview.title && (
            <div className="mb-2">
              <span className="text-amber-400/70 text-[10px] uppercase tracking-widest">Title</span>
              <div className="text-amber-100/90">{preview.title}</div>
            </div>
          )}
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
            {textFieldCount > 1 && (
              <button
                type="button"
                onClick={() => apply(textFields)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-xs font-semibold"
              >
                <Check size={12} /> Accept all
              </button>
            )}
            {preview.title && (
              <button type="button" onClick={() => apply({ title: preview.title })}
                className="px-2.5 py-1.5 rounded border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/10">
                Accept title
              </button>
            )}
            {preview.summary && (
              <button type="button" onClick={() => apply({ summary: preview.summary })}
                className="px-2.5 py-1.5 rounded border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/10">
                Accept summary
              </button>
            )}
            {preview.url && (
              <button type="button" onClick={() => apply({ url: preview.url })}
                className="px-2.5 py-1.5 rounded border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/10">
                Accept URL
              </button>
            )}
            <button type="button" onClick={() => setPreview(null)}
              className="px-2.5 py-1.5 rounded text-amber-200/50 text-xs hover:text-amber-200">
              Discard
            </button>
          </div>

          {chars.length > 0 && (
            <div className="mt-3 pt-2 border-t border-amber-900/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-400/70 text-[10px] uppercase tracking-widest">
                  Characters introduced
                </span>
                <button type="button" onClick={addAllChars}
                  className="text-amber-300/80 hover:text-amber-200 text-[11px]">
                  Add all
                </button>
              </div>
              <ul className="space-y-1.5">
                {chars.map((c) => {
                  const added = addedChars.has(c.name);
                  return (
                    <li key={c.name} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-amber-100/90">{c.name}</span>
                        {c.introInfo && (
                          <p className="text-amber-100/55 text-xs">{c.introInfo}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => addChar(c)}
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] ${
                          added
                            ? "text-emerald-400/70 cursor-default"
                            : "border border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                        }`}
                      >
                        {added ? <><Check size={11} /> Added</> : <><UserPlus size={11} /> Add</>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
