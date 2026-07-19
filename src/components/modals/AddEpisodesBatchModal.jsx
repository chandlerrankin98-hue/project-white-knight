import { useState, useEffect } from "react";
import { Loader, Sparkles, Check, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { campaignById } from "../../constants.js";
import { Modal, Field, inputClass } from "../ui.jsx";
import { checkConfigured, fetchEpisodeInfo } from "../../utils/episodeInfo.js";

// Log multiple episodes at once by entering a range. Runs the same auto-fill
// pipeline as the single-episode modal per row, then presents one combined
// preview that the user accepts wholesale (or per row).
//
// Existing episode numbers in the campaign are automatically skipped.
const MAX_RANGE = 25;
const CONCURRENCY = 8;

async function pMap(items, worker, limit) {
  const out = new Array(items.length);
  let i = 0;
  async function next() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return out;
}

export default function AddEpisodesBatchModal({
  campaign,
  existingEpisodeNums,
  onClose,
  onCommit,
}) {
  const camp = campaignById(campaign);
  const [available, setAvailable] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [rows, setRows] = useState(null); // [{ episodeNum, status: 'ok'|'error', data? , included, expanded }]

  useEffect(() => {
    let cancelled = false;
    checkConfigured().then((c) => { if (!cancelled) setAvailable(c); });
    return () => { cancelled = true; };
  }, []);

  const startFetch = async () => {
    setError(null);
    setRows(null);
    setSkipped([]);
    const f = parseInt(from, 10);
    const t = parseInt(to, 10);
    if (!Number.isFinite(f) || !Number.isFinite(t) || f < 1 || t < f) {
      setError("Enter a valid range (From must be ≤ To, both positive).");
      return;
    }
    if (t - f + 1 > MAX_RANGE) {
      setError(`Range too large — max ${MAX_RANGE} episodes at once.`);
      return;
    }
    const existingSet = new Set(existingEpisodeNums.map((n) => String(n)));
    const all = [];
    for (let n = f; n <= t; n++) all.push(String(n));
    const skips = all.filter((n) => existingSet.has(n));
    const targets = all.filter((n) => !existingSet.has(n));
    setSkipped(skips);
    if (!targets.length) {
      setError("All episodes in that range are already logged.");
      return;
    }
    setLoading(true);
    const results = await pMap(
      targets,
      async (num) => {
        try {
          const data = await fetchEpisodeInfo({
            campaign: campaign,
            episodeNum: num,
            title: "",
            want: ["url", "summary", "title", "characters"],
          });
          const anything = data.title || data.summary || data.url || (data.characters || []).length;
          if (!anything) return { episodeNum: num, status: "error", errorMsg: "No details found." };
          return { episodeNum: num, status: "ok", data };
        } catch (e) {
          return { episodeNum: num, status: "error", errorMsg: e?.message || "Fetch failed." };
        }
      },
      CONCURRENCY
    );
    setRows(
      results.map((r) => ({ ...r, included: r.status === "ok", expanded: false }))
    );
    setLoading(false);
  };

  const toggleIncluded = (i) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, included: !r.included } : r)));
  const toggleExpanded = (i) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, expanded: !r.expanded } : r)));

  const acceptAll = () => {
    const chosen = rows.filter((r) => r.status === "ok" && r.included);
    if (!chosen.length) return;
    onCommit(
      chosen.map((r) => ({
        episodeNum: r.episodeNum,
        title: r.data.title || `Episode ${r.episodeNum}`,
        summary: r.data.summary || "",
        youtubeUrl: r.data.url || "",
        characters: r.data.characters || [],
      }))
    );
  };

  return (
    <Modal title={`Log a range — ${camp.name}`} onClose={onClose}>
      {!available && (
        <p className="text-rose-400/80 text-xs mb-3">
          Auto-fill isn't configured on this deploy. Set ANTHROPIC_API_KEY in Vercel to enable range logging.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="From E#">
          <input
            className={inputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="45"
            inputMode="numeric"
          />
        </Field>
        <Field label="To E#">
          <input
            className={inputClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="52"
            inputMode="numeric"
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={startFetch}
        disabled={loading || !available}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-sm font-semibold disabled:opacity-40 mb-3"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Auto-filling…" : "Auto-fill range"}
      </button>

      {error && <p className="text-rose-400/80 text-xs mb-2">{error}</p>}
      {skipped.length > 0 && (
        <p className="text-amber-200/60 text-xs mb-2">
          Already logged, skipped: {skipped.map((n) => `E${n}`).join(", ")}
        </p>
      )}

      {rows && (
        <>
          <div className="max-h-[45dvh] overflow-y-auto -mx-2 px-2 space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.episodeNum}
                className={`rounded border p-2 ${
                  r.status === "error"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : r.included
                    ? "border-amber-500/30 bg-[#0f0a14]"
                    : "border-amber-900/30 bg-[#0f0a14]/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={r.included}
                    disabled={r.status !== "ok"}
                    onChange={() => toggleIncluded(i)}
                    className="mt-1 accent-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-amber-400/80 text-xs">E{r.episodeNum}</span>
                      {r.status === "error" ? (
                        <span className="inline-flex items-center gap-1 text-rose-400/80 text-xs">
                          <AlertCircle size={11} /> {r.errorMsg}
                        </span>
                      ) : (
                        <span className="text-amber-100/90 text-sm truncate">
                          {r.data.title || "(no title)"}
                        </span>
                      )}
                    </div>
                    {r.status === "ok" && r.expanded && (
                      <div className="mt-1 space-y-1 text-xs">
                        {r.data.summary && (
                          <p className="text-amber-100/80 whitespace-pre-wrap">{r.data.summary}</p>
                        )}
                        {r.data.url && (
                          <a
                            href={r.data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-300 hover:text-red-200 underline"
                          >
                            YouTube link
                          </a>
                        )}
                        {r.data.characters?.length > 0 && (
                          <p className="text-amber-200/60">
                            Characters introduced: {r.data.characters.map((c) => c.name).join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {r.status === "ok" && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(i)}
                      className="text-amber-200/60 hover:text-amber-100"
                      aria-label={r.expanded ? "Collapse" : "Expand"}
                    >
                      {r.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={acceptAll}
            disabled={rows.every((r) => !(r.status === "ok" && r.included))}
            className="w-full mt-3 inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-sm font-semibold disabled:opacity-40 font-display tracking-widest uppercase"
          >
            <Check size={14} /> Save {rows.filter((r) => r.status === "ok" && r.included).length} episodes
          </button>
        </>
      )}
    </Modal>
  );
}
