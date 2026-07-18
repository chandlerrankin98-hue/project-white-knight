import { useState } from "react";
import { CONNECTION_TYPES, campaignById } from "../../constants.js";
import { Modal, Field, inputClass } from "../ui.jsx";

// Link one episode to another. `sourceEp` is the episode the panel belongs to;
// `allEpisodes` is every episode across campaigns so cross-campaign links are
// possible when the user opts in.
export default function AddConnectionModal({ sourceEp, allEpisodes, onSave, onClose }) {
  const [type, setType] = useState(CONNECTION_TYPES[0].id);
  const [note, setNote] = useState("");
  const [crossCampaign, setCrossCampaign] = useState(false);

  // Candidate targets: not the source itself, scoped to the same campaign
  // unless the user allows cross-campaign links.
  const candidates = allEpisodes
    .filter((e) => e.id !== sourceEp.id)
    .filter((e) => crossCampaign || e.campaign === sourceEp.campaign)
    .sort((a, b) => {
      if (a.campaign !== b.campaign) return a.campaign < b.campaign ? -1 : 1;
      return (parseInt(a.episodeNum) || 0) - (parseInt(b.episodeNum) || 0);
    });

  const [targetId, setTargetId] = useState(candidates[0]?.id || "");

  // Keep the selected target valid when toggling the scope changes the list.
  const targetStillValid = candidates.some((e) => e.id === targetId);
  const effectiveTarget = targetStillValid ? targetId : candidates[0]?.id || "";

  const submit = () => {
    if (!effectiveTarget) return;
    onSave({ fromEpisodeId: sourceEp.id, toEpisodeId: effectiveTarget, type, note: note.trim() });
  };

  const sourceCamp = campaignById(sourceEp.campaign);

  return (
    <Modal title={`Link ${sourceCamp?.short}E${sourceEp.episodeNum}`} onClose={onClose}>
      {candidates.length === 0 ? (
        <>
          <p className="text-amber-200/70 mb-4">
            No other episodes to link to yet. Log another episode first
            {!crossCampaign && ", or allow cross-campaign links"}.
          </p>
          {!crossCampaign && allEpisodes.length > 1 && (
            <button
              onClick={() => setCrossCampaign(true)}
              className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-200 py-2 rounded mb-2"
            >
              Allow cross-campaign links
            </button>
          )}
          <button onClick={onClose} className="w-full bg-amber-500 text-[#1a0f1f] py-2 rounded">
            OK
          </button>
        </>
      ) : (
        <>
          <Field label="Connection type">
            <div className="flex flex-wrap gap-2">
              {CONNECTION_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-2.5 py-1.5 rounded border text-xs ${
                    type === t.id
                      ? `${t.bg} ${t.text} border-current`
                      : "border-amber-900/40 text-amber-200/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Related episode">
            <select
              className={inputClass}
              value={effectiveTarget}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {candidates.map((e) => {
                const camp = campaignById(e.campaign);
                return (
                  <option key={e.id} value={e.id}>
                    {camp?.short}E{e.episodeNum} — {e.title}
                  </option>
                );
              })}
            </select>
          </Field>

          <label className="flex items-center gap-2 mb-3 text-amber-200/70 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={crossCampaign}
              onChange={(e) => setCrossCampaign(e.target.checked)}
              className="accent-amber-500"
            />
            Allow links to other campaigns
          </label>

          <Field label="Note (optional)">
            <textarea
              className={inputClass}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How are these episodes connected?"
            />
          </Field>

          <button
            onClick={submit}
            className="w-full bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] font-semibold py-2.5 rounded tracking-widest text-sm uppercase font-display"
          >
            Add Connection
          </button>
        </>
      )}
    </Modal>
  );
}
