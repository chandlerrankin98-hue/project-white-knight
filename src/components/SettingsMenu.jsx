import { useState, useRef } from "react";
import { Settings, Download, Upload } from "lucide-react";

// Small header menu for whole-dataset operations: export the tracker to a JSON
// file, or import one back (the cross-device safety net). Import errors surface
// inline so a bad file can't silently wipe data.
export default function SettingsMenu({ onExport, onImport }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same filename later
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      onImport(text); // throws on invalid input
      setOpen(false);
    } catch (err) {
      setError(err.message || "Import failed.");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setError(null); }}
        className="text-amber-300/70 hover:text-amber-200 p-1.5"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-30 w-56 bg-[#1a0f1f] border border-amber-900/50 rounded-lg shadow-xl p-2">
            <button
              onClick={() => { onExport(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded text-amber-100/90 hover:bg-amber-500/10 text-sm"
            >
              <Download size={15} /> Export data (.json)
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 px-2 py-2 rounded text-amber-100/90 hover:bg-amber-500/10 text-sm"
            >
              <Upload size={15} /> Import data (.json)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              className="hidden"
            />
            {error && <p className="text-rose-400/80 text-xs px-2 mt-1">{error}</p>}
            <p className="text-amber-200/40 text-[10px] px-2 mt-1 leading-snug">
              Importing replaces all current data.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
