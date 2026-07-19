import { useState } from "react";
import { Youtube } from "lucide-react";
import { campaignById } from "../../constants.js";
import { youtubeSearchUrl } from "../../utils/youtube.js";
import { Modal, Field, inputClass } from "../ui.jsx";
import AutoFillButton from "../AutoFillButton.jsx";

export default function AddEpisodeModal({ campaign, onSave, onClose, onAddCharacters }) {
  const [episodeNum, setEpisodeNum] = useState("");
  const [title, setTitle] = useState("");
  const [dateWatched, setDateWatched] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  // Characters surfaced by auto-fill get STAGED here (deduped by name) and are
  // only added when the user hits Save, so closing the modal cancels cleanly.
  const [pendingCharacters, setPendingCharacters] = useState([]);

  const camp = campaignById(campaign);

  const queueCharacters = (chars) => {
    setPendingCharacters((prev) => {
      const seen = new Set(prev.map((c) => c.name.trim().toLowerCase()));
      const next = [...prev];
      for (const c of chars) {
        const key = (c.name || "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        next.push(c);
      }
      return next;
    });
  };

  const submit = () => {
    if (!episodeNum || !title) return;
    onSave({ campaign, episodeNum, title, dateWatched, summary, notes, youtubeUrl });
    // Apply any staged characters after the parent has processed onSave. The
    // parent is expected to close the modal; we call this synchronously here
    // and the parent's addCharacter dedup guards against races.
    if (pendingCharacters.length && onAddCharacters) {
      onAddCharacters(pendingCharacters);
    }
  };

  return (
    <Modal title={`Log ${camp.name} Episode`} onClose={onClose}>
      <Field label="Episode #">
        <input
          className={inputClass}
          value={episodeNum}
          onChange={(e) => setEpisodeNum(e.target.value)}
          placeholder="45"
        />
      </Field>
      <Field label="Title">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A Stage Set"
        />
      </Field>

      {/* Auto-fill title/summary/URL + suggest characters from the episode # */}
      <div className="mb-3 -mt-1">
        <AutoFillButton
          campaign={camp}
          episodeNum={episodeNum}
          title={title}
          label="Auto-fill everything"
          onApply={({ title: t, summary: s, url }) => {
            if (t != null) setTitle(t);
            if (s != null) setSummary(s);
            if (url != null) setYoutubeUrl(url);
          }}
          onQueueCharacters={queueCharacters}
        />
        {pendingCharacters.length > 0 && (
          <p className="mt-1 text-amber-300/70 text-[11px]">
            {pendingCharacters.length} character{pendingCharacters.length === 1 ? "" : "s"} queued — added on Save.
          </p>
        )}
      </div>
      <Field label="Date Watched">
        <input
          type="date"
          className={inputClass}
          value={dateWatched}
          onChange={(e) => setDateWatched(e.target.value)}
        />
      </Field>
      <Field label="YouTube URL (optional)">
        <input
          className={inputClass}
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste now, or attach later"
        />
        {episodeNum && (
          <a
            href={youtubeSearchUrl(campaign, episodeNum, title)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-red-300 hover:text-red-200 inline-flex items-center gap-1 mt-1"
          >
            <Youtube size={12} /> Search YouTube for this episode
          </a>
        )}
      </Field>
      <Field label="What happened this episode">
        <textarea
          className={inputClass}
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="The party arrived in Jrusar, met the Chandei, and discovered the moon was cracking..."
        />
      </Field>
      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Extra reactions, quotes, out-of-game moments..."
        />
      </Field>
      <button
        onClick={submit}
        className="w-full bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] font-semibold py-2.5 rounded tracking-widest text-sm uppercase font-display"
      >
        Save Episode
      </button>
    </Modal>
  );
}
