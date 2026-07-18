import { Trash2 } from "lucide-react";
import { campaignById } from "../constants.js";
import { EmptyState } from "../components/ui.jsx";

export default function TimelineView({ events, characters, episodes, deleteEvent }) {
  if (events.length === 0) return <EmptyState text="No timeline events yet for this campaign." />;

  const sorted = [...events].sort((a, b) => {
    const epA = episodes.find((e) => e.id === a.episodeId);
    const epB = episodes.find((e) => e.id === b.episodeId);
    return (parseInt(epA?.episodeNum) || 0) - (parseInt(epB?.episodeNum) || 0);
  });

  return (
    <ol className="relative border-l-2 border-amber-900/40 ml-3 space-y-4">
      {sorted.map((ev) => {
        const char = characters.find((c) => c.id === ev.characterId);
        const ep = episodes.find((e) => e.id === ev.episodeId);
        const campaign = ep ? campaignById(ep.campaign) : null;
        return (
          <li key={ev.id} className="ml-5">
            <div
              className="absolute -left-[7px] w-3 h-3 rounded-full border-2 border-[#0f0a14]"
              style={{ backgroundColor: campaign?.accent || "#d97706" }}
            />
            <div className="bg-[#1a0f1f]/60 border border-amber-900/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-100 font-display">{char?.name || "Unknown"}</span>
                {ep && (
                  <span className="text-xs font-mono" style={{ color: campaign?.accent }}>
                    {campaign?.short}E{ep.episodeNum}
                  </span>
                )}
              </div>
              <p className="text-amber-100/85 text-sm">{ev.description}</p>
              <button
                onClick={() => deleteEvent(ev.id)}
                className="mt-2 text-rose-400/60 hover:text-rose-300"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
