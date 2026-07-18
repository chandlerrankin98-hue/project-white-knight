import { Trash2, Youtube, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { extractYouTubeId, youtubeSearchUrl } from "../utils/youtube.js";
import PasteUrlField from "./PasteUrlField.jsx";
import AttachUrlButton from "./AttachUrlButton.jsx";

// A single expandable episode row. `campaign` is the full campaign object.
export default function EpisodeCard({ ep, campaign, expanded, onToggle, deleteEpisode, updateEpisode }) {
  const videoId = extractYouTubeId(ep.youtubeUrl);

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
