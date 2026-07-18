import { Trash2 } from "lucide-react";
import { statusById, campaignById } from "../constants.js";
import { EmptyState } from "../components/ui.jsx";
import CharacterAutoFillButton from "../components/CharacterAutoFillButton.jsx";

export default function CharacterDetail({ character, events, episodes, onBack, onDeleteEvent, updateCharacter }) {
  if (!character) return null;
  const status = statusById(character.status) || statusById("alive");
  const StatusIcon = status.icon;
  const campaign = campaignById(character.campaign);

  const sortedEvents = [...events].sort((a, b) => {
    const epA = episodes.find((e) => e.id === a.episodeId);
    const epB = episodes.find((e) => e.id === b.episodeId);
    return (parseInt(epA?.episodeNum) || 0) - (parseInt(epB?.episodeNum) || 0);
  });

  return (
    <div>
      <button onClick={onBack} className="text-amber-400/70 text-sm mb-4 flex items-center gap-1">
        ← Back
      </button>
      <div className="bg-gradient-to-br from-[#1a0f1f] to-[#0f0a14] border border-amber-900/40 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-amber-100 text-2xl font-display">{character.name}</h2>
            {character.title && <div className="text-amber-300/70 italic">{character.title}</div>}
          </div>
          <StatusIcon className={status.color} size={24} />
        </div>
        <div className="text-amber-200/60 text-sm mt-2">
          {campaign?.name} {character.player && `· ${character.player}`}
        </div>
        {character.notes && <p className="text-amber-100/85 mt-3">{character.notes}</p>}

        {/* Stats & skills block */}
        {character.stats && (
          <div className="mt-4 pt-3 border-t border-amber-900/30">
            <div className="text-amber-400/80 text-[11px] tracking-[0.2em] uppercase font-display mb-1">
              Stats &amp; skills
            </div>
            <pre className="text-amber-100/85 text-sm whitespace-pre-wrap font-body leading-relaxed">
              {character.stats}
            </pre>
          </div>
        )}

        {/* Auto-fill (preview-then-accept); applies to this character */}
        {updateCharacter && (
          <div className="mt-3">
            <CharacterAutoFillButton
              campaign={campaign}
              name={character.name}
              label={character.stats ? "Auto-fill again" : "Auto-fill stats & details"}
              onApply={(fields) => updateCharacter(character.id, fields)}
            />
          </div>
        )}
      </div>

      <h3 className="text-amber-400/80 text-sm tracking-[0.25em] uppercase mb-3 font-display">
        Timeline
      </h3>

      {sortedEvents.length === 0 ? (
        <EmptyState text="No events logged. Tap + to add one." />
      ) : (
        <ol className="relative border-l-2 border-amber-900/40 ml-3 space-y-4">
          {sortedEvents.map((ev) => {
            const ep = episodes.find((e) => e.id === ev.episodeId);
            return (
              <li key={ev.id} className="ml-5">
                <div
                  className="absolute -left-[7px] w-3 h-3 rounded-full border-2 border-[#0f0a14]"
                  style={{ backgroundColor: campaign?.accent }}
                />
                <div className="bg-[#1a0f1f]/60 border border-amber-900/30 rounded-lg p-3">
                  {ep && (
                    <div className="text-xs font-mono mb-1" style={{ color: campaign?.accent }}>
                      {campaign?.short}E{ep.episodeNum} · {ep.title}
                    </div>
                  )}
                  <p className="text-amber-100/90">{ev.description}</p>
                  <button
                    onClick={() => onDeleteEvent(ev.id)}
                    className="mt-2 text-rose-400/60 hover:text-rose-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
