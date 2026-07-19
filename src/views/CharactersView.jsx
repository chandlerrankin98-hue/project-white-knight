import { Trash2, Lock } from "lucide-react";
import { statusById } from "../constants.js";
import { EmptyState } from "../components/ui.jsx";
import { isSpoilerRevealed } from "../utils/progress.js";
import CampaignCharactersButton from "../components/CampaignCharactersButton.jsx";

export default function CharactersView({
  characters,
  setSelectedChar,
  deleteCharacter,
  campaign,
  progress,
  onAddCharacters,
}) {
  return (
    <div>
      <CampaignCharactersButton
        campaign={campaign}
        progress={progress}
        existingNames={characters.map((c) => c.name)}
        onAdd={onAddCharacters}
      />

      {characters.length === 0 ? (
        <EmptyState text="No characters in this campaign yet." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {characters.map((char) => {
            const status = statusById(char.status) || statusById("alive");
            const StatusIcon = status.icon;
            // Spoiler-safe surface text: intro info if present, else notes.
            const surface = char.introInfo || char.notes;
            const hasHiddenSpoiler = !!char.spoilerInfo && !isSpoilerRevealed(char, progress);
            return (
              <div
                key={char.id}
                className="bg-gradient-to-br from-[#1a0f1f] to-[#0f0a14] border border-amber-900/40 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <button onClick={() => setSelectedChar(char.id)} className="text-left flex-1">
                    <h3 className="text-amber-100 text-xl font-display">{char.name}</h3>
                    {char.title && <div className="text-amber-300/70 text-sm italic">{char.title}</div>}
                  </button>
                  <div className="flex items-center gap-2">
                    {hasHiddenSpoiler && (
                      <span title="Has backstory hidden to avoid spoilers">
                        <Lock size={14} className="text-amber-500/50" />
                      </span>
                    )}
                    <StatusIcon className={status.color} size={20} />
                  </div>
                </div>
                {char.player && (
                  <div className="text-xs text-amber-200/60 mb-2">Played by {char.player}</div>
                )}
                {surface && <p className="text-amber-100/75 text-sm">{surface}</p>}
                <div className="mt-3 flex justify-between items-center">
                  <button
                    onClick={() => setSelectedChar(char.id)}
                    className="text-amber-400 text-xs tracking-widest uppercase font-display"
                  >
                    View Timeline →
                  </button>
                  <button
                    onClick={() => deleteCharacter(char.id)}
                    className="text-rose-400/60 hover:text-rose-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
