import { useState, useEffect } from "react";
import { Sparkles, Loader, Check, X, UserPlus } from "lucide-react";
import { checkConfigured, fetchCampaignCharacters } from "../utils/charactersInCampaign.js";

// Bulk "auto-add characters up to E#": fetches the main characters introduced up
// to the campaign's current progress and lets the user pick which to add.
// Preview-then-accept; hides itself when the proxy isn't configured or progress
// is 0 (nothing logged yet).
export default function CampaignCharactersButton({ campaign, progress, existingNames, onAdd }) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null); // fetched list
  const [picked, setPicked] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    checkConfigured().then((c) => { if (!cancelled) setAvailable(c); });
    return () => { cancelled = true; };
  }, []);

  if (!available || !progress) return null;

  const existing = new Set((existingNames || []).map((n) => n.trim().toLowerCase()));

  const run = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const chars = await fetchCampaignCharacters({ campaign: campaign.id, uptoEpisode: progress });
      // Drop ones already tracked; default-select the rest.
      const fresh = chars.filter((c) => !existing.has((c.name || "").trim().toLowerCase()));
      if (!fresh.length) {
        setError(chars.length ? "All found characters are already added." : "Couldn't find characters — try again.");
      } else {
        setResults(fresh);
        setPicked(new Set(fresh.map((c) => c.name)));
      }
    } catch (e) {
      setError("Lookup failed. Check your connection.");
    }
    setLoading(false);
  };

  const toggle = (name) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const addPicked = () => {
    const chosen = results.filter((c) => picked.has(c.name));
    if (chosen.length) onAdd(chosen);
    setResults(null);
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Searching..." : `Auto-add characters up to E${progress}`}
      </button>

      {error && <p className="text-rose-400/80 text-[11px] mt-1">{error}</p>}

      {results && (
        <div className="mt-2 bg-[#0f0a14] border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300/80 text-[10px] tracking-widest uppercase font-display">
              Found {results.length} — pick to add
            </span>
            <button type="button" onClick={() => setResults(null)}
              className="text-amber-200/60 hover:text-amber-100" aria-label="Discard">
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {results.map((c) => {
              const on = picked.has(c.name);
              return (
                <li key={c.name}>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={on} onChange={() => toggle(c.name)}
                      className="mt-1 accent-amber-500" />
                    <span className="flex-1 min-w-0">
                      <span className="text-amber-100/90 text-sm">
                        {c.name}
                        {c.firstEpisode != null && (
                          <span className="text-amber-400/60 text-xs font-mono ml-1.5">
                            E{c.firstEpisode}
                          </span>
                        )}
                      </span>
                      {c.introInfo && <p className="text-amber-100/55 text-xs">{c.introInfo}</p>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 mt-3 pt-2 border-t border-amber-900/30">
            <button type="button" onClick={addPicked} disabled={picked.size === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-xs font-semibold disabled:opacity-40">
              <UserPlus size={12} /> Add {picked.size} character{picked.size === 1 ? "" : "s"}
            </button>
            <button type="button" onClick={() => setResults(null)}
              className="px-2.5 py-1.5 rounded text-amber-200/50 text-xs hover:text-amber-200">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
