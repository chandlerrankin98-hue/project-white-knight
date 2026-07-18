import { Trash2 } from "lucide-react";
import { statusById } from "../constants.js";
import { EmptyState } from "../components/ui.jsx";

export default function CharactersView({ characters, setSelectedChar, deleteCharacter }) {
  if (characters.length === 0) return <EmptyState text="No characters in this campaign yet." />;

  return (
    <div className="grid grid-cols-1 gap-3">
      {characters.map((char) => {
        const status = statusById(char.status) || statusById("alive");
        const StatusIcon = status.icon;
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
              <StatusIcon className={status.color} size={20} />
            </div>
            {char.player && (
              <div className="text-xs text-amber-200/60 mb-2">Played by {char.player}</div>
            )}
            {char.notes && <p className="text-amber-100/75 text-sm">{char.notes}</p>}
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
  );
}
