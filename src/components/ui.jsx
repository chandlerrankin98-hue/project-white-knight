import { X } from "lucide-react";

export const inputClass =
  "w-full bg-[#0f0a14] border border-amber-900/40 rounded px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500/60 text-base";

export function EmptyState({ text }) {
  return (
    <div className="text-center py-16 text-amber-200/40 italic">
      <div className="text-4xl mb-3 text-amber-500/30">✦</div>
      {text}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-[#1a0f1f] border border-amber-900/40 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 overflow-y-auto"
        style={{ maxHeight: "min(90vh, 100dvh)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-amber-100 text-lg tracking-wide font-display">{title}</h3>
          <button onClick={onClose} className="text-amber-200/60 hover:text-amber-100">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-amber-300/70 text-xs tracking-widest uppercase mb-1 font-display">
        {label}
      </span>
      {children}
    </label>
  );
}
