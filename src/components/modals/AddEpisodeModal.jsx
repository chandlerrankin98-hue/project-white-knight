import { useState } from "react";
import { Youtube } from "lucide-react";
import { campaignById } from "../../constants.js";
import { youtubeSearchUrl } from "../../utils/youtube.js";
import { Modal, Field, inputClass } from "../ui.jsx";
import AutoFillButton from "../AutoFillButton.jsx";

export default function AddEpisodeModal({ campaign, onSave, onClose }) {
  const [episodeNum, setEpisodeNum] = useState("");
  const [title, setTitle] = useState("");
  const [dateWatched, setDateWatched] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const camp = campaignById(campaign);

  const submit = () => {
    if (!episodeNum || !title) return;
    onSave({ campaign, episodeNum, title, dateWatched, summary, notes, youtubeUrl });
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

      {/* Auto-fill summary + URL from just the episode number */}
      <div className="mb-3 -mt-1">
        <AutoFillButton
          campaign={camp}
          episodeNum={episodeNum}
          title={title}
          label="Auto-fill summary & URL"
          onApply={({ summary: s, url }) => {
            if (s != null) setSummary(s);
            if (url != null) setYoutubeUrl(url);
          }}
        />
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
