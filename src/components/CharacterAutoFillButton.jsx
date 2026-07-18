import { useState, useEffect } from "react";
import { Sparkles, Loader, Check, X } from "lucide-react";
import { checkConfigured, fetchCharacterInfo } from "../utils/characterInfo.js";

const FIELD_LABELS = {
  title: "Title / Class",
  player: "Player",
  stats: "Stats & skills",
  notes: "Background notes",
};

// Auto-populates a character's fields from the /api/character-info proxy (web
// search grounded in the Critical Role wiki). Preview-then-accept: fetched
// values are shown for review and only applied on an explicit tap, so nothing
// overwrites existing text silently. Hides itself when the proxy isn't
// configured or is unreachable — manual entry still works.
export default function CharacterAutoFillButton({
  campaign,
  name,
  want = ["title", "player", "stats", "notes"],
  onApply,
  label = "Auto-fill from name",
}) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { title, player, stats, notes }

  useEffect(() => {
    let cancelled = false;
    checkConfigured().then((c) => { if (!cancelled) setAvailable(c); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  const disabled = loading || !name;

  const run = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await fetchCharacterInfo({ campaign: campaign.id, name, want });
      const anything = Object.values(result).some((v) => v);
      if (!anything) {
        setError("Couldn't find details — try again or fill in manually.");
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

  // Fields that actually came back (non-null), in a stable order.
  const filled = preview
    ? ["title", "player", "stats", "notes"].filter((f) => preview[f])
    : [];

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={disabled}
        title={!name ? "Enter a character name first" : undefined}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed self-start"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Searching..." : label}
      </button>

      {error && <span className="text-rose-400/80 text-[10px]">{error}</span>}

      {preview && (
        <div className="mt-1 bg-[#0f0a14] border border-amber-500/30 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
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

          <div className="space-y-2">
            {filled.map((f) => (
              <div key={f}>
                <div className="text-amber-400/70 text-[10px] tracking-widest uppercase font-display mb-0.5">
                  {FIELD_LABELS[f]}
                </div>
                <p className="text-amber-100/85 whitespace-pre-wrap leading-relaxed">
                  {preview[f]}
                </p>
                <button
                  type="button"
                  onClick={() => apply({ [f]: preview[f] })}
                  className="mt-1 px-2 py-1 rounded border border-amber-500/40 text-amber-200 text-[11px] hover:bg-amber-500/10"
                >
                  Accept {FIELD_LABELS[f].toLowerCase()}
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-amber-900/30">
            {filled.length > 1 && (
              <button
                type="button"
                onClick={() => apply(Object.fromEntries(filled.map((f) => [f, preview[f]])))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-xs font-semibold"
              >
                <Check size={12} /> Accept all
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
