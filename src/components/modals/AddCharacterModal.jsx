import { useState } from "react";
import { STATUSES, campaignById } from "../../constants.js";
import { Modal, Field, inputClass } from "../ui.jsx";

export default function AddCharacterModal({ campaign, onSave, onClose }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [player, setPlayer] = useState("");
  const [status, setStatus] = useState("alive");
  const [notes, setNotes] = useState("");

  const camp = campaignById(campaign);

  const submit = () => {
    if (!name) return;
    onSave({ name, title, campaign, player, status, notes });
  };

  return (
    <Modal title={`Add Character — ${camp.name}`} onClose={onClose}>
      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Imogen Temult"
        />
      </Field>
      <Field label="Title / Class">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sorcerer of the Storm"
        />
      </Field>
      <Field label="Player">
        <input
          className={inputClass}
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          placeholder="Laura Bailey"
        />
      </Field>
      <Field label="Status">
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={`flex-1 py-2 rounded border text-sm ${
                status === s.id
                  ? "border-amber-500 bg-amber-500/10 text-amber-200"
                  : "border-amber-900/40 text-amber-200/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Background, motivations, traits..."
        />
      </Field>
      <button
        onClick={submit}
        className="w-full bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] font-semibold py-2.5 rounded tracking-widest text-sm uppercase font-display"
      >
        Add Character
      </button>
    </Modal>
  );
}
