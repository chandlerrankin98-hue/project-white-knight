import { useState, useEffect } from "react";
import { Sparkles, Loader, Check, X } from "lucide-react";
import { connectionTypeById, campaignById } from "../constants.js";
import { checkConfigured, fetchSuggestedConnections } from "../utils/episodeConnections.js";
import { applyConnections } from "../utils/applyConnections.js";

function TypeBadge({ typeId }) {
  const t = connectionTypeById(typeId);
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.bg} ${t.text} whitespace-nowrap`}>
      {t.label}
    </span>
  );
}

// Auto-detect connections between the source episode and other logged episodes
// in the same campaign. Preview-then-accept: fetched suggestions are shown for
// review and only applied on tap. Hides itself when the proxy isn't configured.
//
// `existingConnections` is used to exclude pairs that already have a connection
// in either direction, so we don't waste a call re-suggesting known links.
export default function AutoConnectButton({
  sourceEp,
  allEpisodes,
  existingConnections,
  addConnection,
}) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(null); // [{toEpisodeId, type, note}]
  const [picked, setPicked] = useState(() => new Set());
  const [info, setInfo] = useState(null); // e.g. "log more episodes first"

  useEffect(() => {
    let cancelled = false;
    checkConfigured().then((c) => { if (!cancelled) setAvailable(c); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  // Candidates = other logged episodes in the same campaign, excluding those
  // already connected to the source (either direction).
  const connectedPeers = new Set();
  existingConnections.forEach((c) => {
    if (c.fromEpisodeId === sourceEp.id) connectedPeers.add(c.toEpisodeId);
    if (c.toEpisodeId === sourceEp.id) connectedPeers.add(c.fromEpisodeId);
  });
  const candidateEpisodes = allEpisodes.filter(
    (e) => e.campaign === sourceEp.campaign && e.id !== sourceEp.id && !connectedPeers.has(e.id)
  );

  const run = async () => {
    setError(null);
    setInfo(null);
    setSuggestions(null);
    if (candidateEpisodes.length === 0) {
      setInfo("Log more episodes in this campaign to detect connections.");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchSuggestedConnections({
        campaign: sourceEp.campaign,
        sourceEpisode: {
          episodeNum: sourceEp.episodeNum,
          title: sourceEp.title,
          summary: sourceEp.summary,
        },
        candidateEpisodes: candidateEpisodes.map((e) => ({
          id: e.id,
          episodeNum: e.episodeNum,
          title: e.title,
          summary: e.summary,
        })),
      });
      if (!result.length) {
        setInfo("No confident connections found. Try after logging more episodes.");
      } else {
        setSuggestions(result);
        // Default: all selected.
        setPicked(new Set(result.map((_, i) => i)));
      }
    } catch (e) {
      setError("Auto-detect failed. Check your connection and try again.");
    }
    setLoading(false);
  };

  const toggle = (i) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const addPicked = () => {
    const chosen = suggestions
      .filter((_, i) => picked.has(i))
      .map((s) => ({ fromEpisodeId: sourceEp.id, ...s }));
    applyConnections(existingConnections, chosen, addConnection);
    setSuggestions(null);
  };

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 self-start"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Detecting..." : "Auto-detect connections"}
      </button>

      {info && <p className="text-amber-200/60 italic text-[11px]">{info}</p>}
      {error && <p className="text-rose-400/80 text-[11px]">{error}</p>}

      {suggestions && (
        <div className="mt-1 bg-[#0f0a14] border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300/80 text-[10px] tracking-widest uppercase font-display">
              Suggested — {suggestions.length}
            </span>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
              className="text-amber-200/60 hover:text-amber-100"
              aria-label="Discard suggestions"
            >
              <X size={14} />
            </button>
          </div>

          <ul className="space-y-1.5">
            {suggestions.map((s, i) => {
              const target = allEpisodes.find((e) => e.id === s.toEpisodeId);
              const camp = target ? campaignById(target.campaign) : null;
              const on = picked.has(i);
              return (
                <li key={`${s.toEpisodeId}-${s.type}-${i}`}>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(i)}
                      className="mt-1 accent-amber-500"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        {target ? (
                          <span className="text-xs font-mono" style={{ color: camp?.accent }}>
                            {camp?.short}E{target.episodeNum}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-amber-200/40">(missing)</span>
                        )}
                        <span className="text-amber-100/90 text-sm truncate">
                          {target?.title || ""}
                        </span>
                        <TypeBadge typeId={s.type} />
                      </span>
                      {s.note && (
                        <p className="text-amber-100/60 text-xs italic mt-0.5">{s.note}</p>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-2 mt-3 pt-2 border-t border-amber-900/30">
            <button
              type="button"
              onClick={addPicked}
              disabled={picked.size === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-xs font-semibold disabled:opacity-40"
            >
              <Check size={12} /> Add {picked.size} connection{picked.size === 1 ? "" : "s"}
            </button>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
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
