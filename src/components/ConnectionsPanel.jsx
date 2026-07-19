import { useState } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { connectionTypeById, campaignById } from "../constants.js";
import AddConnectionModal from "./modals/AddConnectionModal.jsx";
import AutoConnectButton from "./AutoConnectButton.jsx";

function TypeBadge({ typeId }) {
  const t = connectionTypeById(typeId);
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.bg} ${t.text} whitespace-nowrap`}>
      {t.label}
    </span>
  );
}

// One connection row. `otherEp` is the episode at the far end of the link.
function ConnectionRow({ conn, otherEp, onDelete }) {
  const camp = otherEp ? campaignById(otherEp.campaign) : null;
  return (
    <li className="flex items-start gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {otherEp ? (
            <span className="text-xs font-mono" style={{ color: camp?.accent }}>
              {camp?.short}E{otherEp.episodeNum}
            </span>
          ) : (
            <span className="text-xs font-mono text-amber-200/40">(deleted)</span>
          )}
          <span className="text-amber-100/90 text-sm truncate">{otherEp?.title || ""}</span>
          <TypeBadge typeId={conn.type} />
        </div>
        {conn.note && <p className="text-amber-100/60 text-xs italic mt-0.5">{conn.note}</p>}
      </div>
      <button
        onClick={() => onDelete(conn.id)}
        className="text-rose-400/50 hover:text-rose-300 mt-0.5 shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </li>
  );
}

// Shows connections for one episode: outgoing ("Related to") and incoming
// ("Referenced by"). `connections` is the full list; `allEpisodes` is every
// episode so we can resolve the far end regardless of campaign.
export default function ConnectionsPanel({ ep, connections, allEpisodes, addConnection, deleteConnection }) {
  const [showAdd, setShowAdd] = useState(false);
  const epById = (id) => allEpisodes.find((e) => e.id === id);

  const outgoing = connections.filter((c) => c.fromEpisodeId === ep.id);
  const incoming = connections.filter((c) => c.toEpisodeId === ep.id);

  return (
    <div className="mt-4 pt-3 border-t border-amber-900/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-amber-400/80 text-[11px] tracking-[0.2em] uppercase font-display">
          Connections
        </span>
        <button
          onClick={() => setShowAdd(true)}
          className="text-amber-400/70 hover:text-amber-300 flex items-center gap-1 text-xs"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {outgoing.length === 0 && incoming.length === 0 ? (
        <p className="text-amber-200/40 italic text-sm">
          No connections yet. Link this to episodes it foreshadows or calls back to.
        </p>
      ) : (
        <div className="space-y-3">
          {outgoing.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-amber-300/60 text-[10px] uppercase tracking-widest mb-0.5">
                <ArrowRight size={11} /> Related to
              </div>
              <ul className="divide-y divide-amber-900/20">
                {outgoing.map((c) => (
                  <ConnectionRow
                    key={c.id}
                    conn={c}
                    otherEp={epById(c.toEpisodeId)}
                    onDelete={deleteConnection}
                  />
                ))}
              </ul>
            </div>
          )}
          {incoming.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-amber-300/60 text-[10px] uppercase tracking-widest mb-0.5">
                <ArrowLeft size={11} /> Referenced by
              </div>
              <ul className="divide-y divide-amber-900/20">
                {incoming.map((c) => (
                  <ConnectionRow
                    key={c.id}
                    conn={c}
                    otherEp={epById(c.fromEpisodeId)}
                    onDelete={deleteConnection}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <AutoConnectButton
        sourceEp={ep}
        allEpisodes={allEpisodes}
        existingConnections={connections}
        addConnection={addConnection}
      />

      {showAdd && (
        <AddConnectionModal
          sourceEp={ep}
          allEpisodes={allEpisodes}
          onSave={(fields) => {
            addConnection(fields);
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
