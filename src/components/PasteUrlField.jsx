import { useState } from "react";

export default function PasteUrlField({ value, onChange }) {
  const [showField, setShowField] = useState(!!value);
  const [draft, setDraft] = useState(value);

  if (!showField) {
    return (
      <button
        onClick={() => setShowField(true)}
        className="text-amber-400/60 text-xs hover:text-amber-300 mt-2"
      >
        + Paste YouTube URL manually
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        className="flex-1 bg-[#0f0a14] border border-amber-900/40 rounded px-2 py-1.5 text-amber-100 text-xs focus:outline-none focus:border-amber-500/60"
      />
      <button
        onClick={() => {
          onChange(draft);
          setShowField(!!draft);
        }}
        className="px-3 py-1.5 rounded bg-amber-500 text-[#1a0f1f] text-xs font-semibold"
      >
        Save
      </button>
    </div>
  );
}
