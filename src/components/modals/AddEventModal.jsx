import { useState } from "react";
import { campaignById } from "../../constants.js";
import { Modal, Field, inputClass } from "../ui.jsx";

export default function AddEventModal({ characters, episodes, prefilledCharId, onSave, onClose }) {
  const [characterId, setCharacterId] = useState(prefilledCharId || characters[0]?.id || "");
  const [episodeId, setEpisodeId] = useState(episodes[episodes.length - 1]?.id || "");
  const [description, setDescription] = useState("");

  if (characters.length === 0) {
    return (
      <Modal title="Add Event" onClose={onClose}>
        <p className="text-amber-200/70 mb-4">Add a character to this campaign first.</p>
        <button onClick={onClose} className="w-full bg-amber-500 text-[#1a0f1f] py-2 rounded">
          OK
        </button>
      </Modal>
    );
  }
  if (episodes.length === 0) {
    return (
      <Modal title="Add Event" onClose={onClose}>
        <p className="text-amber-200/70 mb-4">Log an episode in this campaign first.</p>
        <button onClick={onClose} className="w-full bg-amber-500 text-[#1a0f1f] py-2 rounded">
          OK
        </button>
      </Modal>
    );
  }

  const submit = () => {
    if (!description) return;
    onSave({ characterId, episodeId, description });
  };

  return (
    <Modal title="Add Timeline Event" onClose={onClose}>
      <Field label="Character">
        <select
          className={inputClass}
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Episode">
        <select
          className={inputClass}
          value={episodeId}
          onChange={(e) => setEpisodeId(e.target.value)}
        >
          {episodes.map((e) => {
            const camp = campaignById(e.campaign);
            return (
              <option key={e.id} value={e.id}>
                {camp?.short}E{e.episodeNum} — {e.title}
              </option>
            );
          })}
        </select>
      </Field>
      <Field label="What happened?">
        <textarea
          className={inputClass}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Met the Hells. Discovered the shard. Made a deal with..."
        />
      </Field>
      <button
        onClick={submit}
        className="w-full bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] font-semibold py-2.5 rounded tracking-widest text-sm uppercase font-display"
      >
        Save Event
      </button>
    </Modal>
  );
}
