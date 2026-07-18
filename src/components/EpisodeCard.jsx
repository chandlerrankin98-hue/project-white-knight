import { useState } from "react";
import { Trash2, Youtube, ExternalLink, ChevronDown, ChevronUp, Pencil, Check } from "lucide-react";
import { extractYouTubeId, youtubeSearchUrl } from "../utils/youtube.js";
import PasteUrlField from "./PasteUrlField.jsx";
import AttachUrlButton from "./AttachUrlButton.jsx";

// A single expandable episode row. `campaign` is the full campaign object.
export default function EpisodeCard({ ep, campaign, expanded, onToggle, deleteEpisode, updateEpisode }) {
  const videoId = extractYouTubeId(ep.youtubeUrl);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(ep.summary || "");

  const startEditSummary = () => {
    setSummaryDraft(ep.summary || "");
    setEditingSummary(true);
  };
  const saveSummary = () => {
    updateEpisode(ep.id, { summary: summaryDraft.trim() });
    setEditingSummary(false);
  };

  return (
    <div className="bg-[#1a0f1f]/60 border border-amber-900/30 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <span className="text-xs font-mono w-12" style={{ color: campaign.accent }}>
          {campaign.short}E{ep.episodeNum}
        </span>
        <span className="flex-1 text-amber-100">{ep.title}</span>
        {videoId && <Youtube size={14} className="text-red-500/70" />}
        {expanded ? (
          <ChevronUp size={16} className="text-amber-500/60" />
        ) : (
          <ChevronDown size={16} className="text-amber-500/60" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-amber-900/30">
          {ep.dateWatched && (
            <div className="text-amber-500/60 text-xs italic mb-2">Watched {ep.dateWatched}</div>
          )}

          {/* What happened — the episode summary, inline-editable */}
          <div className="my-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-amber-400/80 text-[11px] tracking-[0.2em] uppercase font-display">
                What happened
              </span>
              {editingSummary ? (
                <button
                  onClick={saveSummary}
                  className="text-emerald-400/80 hover:text-emerald-300 flex items-center gap-1 text-xs"
                >
                  <Check size={13} /> Save
                </button>
              ) : (
                <button
                  onClick={startEditSummary}
                  className="text-amber-400/60 hover:text-amber-300 flex items-center gap-1 text-xs"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
            {editingSummary ? (
              <textarea
                autoFocus
                rows={4}
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                placeholder="Recap the key events of this episode..."
                className="w-full bg-[#0f0a14] border border-amber-900/40 rounded px-3 py-2 text-amber-100 text-base focus:outline-none focus:border-amber-500/60"
              />
            ) : ep.summary ? (
              <p className="text-amber-100/90 whitespace-pre-wrap leading-relaxed text-[1.05rem]">
                {ep.summary}
              </p>
            ) : (
              <button
                onClick={startEditSummary}
                className="text-amber-200/40 italic text-sm hover:text-amber-200/70"
              >
                No summary yet — tap to add what happened.
              </button>
            )}
          </div>

          {/* YouTube embed or link */}
          {videoId ? (
            <div className="my-3 rounded-lg overflow-hidden border border-amber-900/40">
              <div style={{ paddingBottom: "56.25%", position: "relative" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={ep.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                />
              </div>
            </div>
          ) : (
            <div className="my-3 flex flex-wrap gap-2">
              <a
                href={youtubeSearchUrl(campaign.id, ep.episodeNum, ep.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20"
              >
                <Youtube size={14} /> Find on YouTube <ExternalLink size={11} />
              </a>
              <AttachUrlButton
                campaign={campaign}
                episode={ep}
                onAttach={(url) => updateEpisode(ep.id, { youtubeUrl: url })}
              />
            </div>
          )}

          {/* Paste URL field (always available) */}
          <PasteUrlField
            value={ep.youtubeUrl || ""}
            onChange={(url) => updateEpisode(ep.id, { youtubeUrl: url })}
          />

          {ep.notes ? (
            <p className="text-amber-100/85 whitespace-pre-wrap leading-relaxed mt-3">{ep.notes}</p>
          ) : (
            <p className="text-amber-200/40 italic text-sm mt-3">No notes yet.</p>
          )}

          <button
            onClick={() => deleteEpisode(ep.id)}
            className="mt-3 text-rose-400/70 text-xs flex items-center gap-1 hover:text-rose-300"
          >
            <Trash2 size={12} /> Delete episode
          </button>
        </div>
      )}
    </div>
  );
}
