import { useState } from "react";
import { Plus, BookOpen, Users, Clock, Share2 } from "lucide-react";
import { CAMPAIGNS, campaignById } from "./constants.js";
import { campaignProgress } from "./utils/progress.js";
import { scanConnectionsForNewEpisodes } from "./utils/scanConnections.js";
import { scanEventsForNewEpisodes } from "./utils/scanEvents.js";
import { useTrackerData } from "./hooks/useTrackerData.js";
import EpisodesView from "./views/EpisodesView.jsx";
import CharactersView from "./views/CharactersView.jsx";
import CharacterDetail from "./views/CharacterDetail.jsx";
import TimelineView from "./views/TimelineView.jsx";
import GraphView from "./views/GraphView.jsx";
import AddEpisodeModal from "./components/modals/AddEpisodeModal.jsx";
import AddEpisodesBatchModal from "./components/modals/AddEpisodesBatchModal.jsx";
import AddCharacterModal from "./components/modals/AddCharacterModal.jsx";
import AddEventModal from "./components/modals/AddEventModal.jsx";
import SettingsMenu from "./components/SettingsMenu.jsx";

export default function App() {
  const data = useTrackerData();
  const {
    loading,
    episodes,
    characters,
    events,
    connections,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addEvent,
    deleteEvent,
    addConnection,
    deleteConnection,
    doExport,
    doImport,
  } = data;

  const [activeCampaign, setActiveCampaign] = useState("c3");
  const [view, setView] = useState("episodes");
  const [showAdd, setShowAdd] = useState(null);
  const [selectedChar, setSelectedChar] = useState(null);
  const [expandedEp, setExpandedEp] = useState(null);
  // Toast for the async post-save connection scan.
  const [scanStatus, setScanStatus] = useState(null); // null | { done, total, added? }
  // User preference (persisted in localStorage) — auto-run the connection scan
  // when an episode is saved. Default on when the proxy is likely configured.
  const [autoScan, setAutoScan] = useState(() => {
    const v = localStorage.getItem("cr-auto-scan");
    return v == null ? true : v === "1";
  });
  const setAutoScanPersisted = (v) => {
    setAutoScan(v);
    localStorage.setItem("cr-auto-scan", v ? "1" : "0");
  };

  // Filter everything by active campaign
  const campEpisodes = episodes.filter((e) => e.campaign === activeCampaign);
  const campCharacters = characters.filter((c) => c.campaign === activeCampaign);
  const campEpisodeIds = new Set(campEpisodes.map((e) => e.id));
  const campEvents = events.filter((ev) => campEpisodeIds.has(ev.episodeId));
  // Connections with both ends inside the active campaign (for the tab count).
  const campConnections = connections.filter(
    (c) => campEpisodeIds.has(c.fromEpisodeId) && campEpisodeIds.has(c.toEpisodeId)
  );

  const currentCamp = campaignById(activeCampaign);
  // How far the viewer has watched this campaign (highest logged episode #).
  const progress = campaignProgress(episodes, activeCampaign);

  // Add characters surfaced by auto-fill (from an episode or the bulk action),
  // deduped by name within the active campaign so re-running doesn't duplicate.
  const addIntroducedCharacters = (chars) => {
    const existing = new Set(
      characters
        .filter((c) => c.campaign === activeCampaign)
        .map((c) => c.name.trim().toLowerCase())
    );
    chars.forEach((c) => {
      const key = (c.name || "").trim().toLowerCase();
      if (!key || existing.has(key)) return;
      existing.add(key);
      addCharacter({
        name: c.name.trim(),
        campaign: activeCampaign,
        status: "alive",
        firstEpisode: c.firstEpisode != null ? String(c.firstEpisode) : "",
        introInfo: c.introInfo || "",
      });
    });
  };

  // Jump from the graph to an episode: switch to its campaign, open the
  // Episodes tab, and expand that episode.
  const jumpToEpisode = (epId) => {
    const ep = episodes.find((e) => e.id === epId);
    if (!ep) return;
    setActiveCampaign(ep.campaign);
    setView("episodes");
    setSelectedChar(null);
    setExpandedEp(epId);
  };

  // Kick off the post-save scan pass: connections + events, in parallel.
  // Runs in the background with a small progress toast so it never blocks the
  // UI. Character auto-fill (via scanEvents) uses characters the user has
  // already tracked, so brand-new "queued" characters from the same save that
  // land AFTER this fires get picked up on the next save (or via a later
  // event scan pass).
  const runPostSaveScan = async (newEps) => {
    if (!autoScan || !newEps.length) return;
    setScanStatus({ done: 0, total: 1 }); // indeterminate "working…" until done
    try {
      const allNow = [...episodes, ...newEps];
      const [addedConns, addedEvents] = await Promise.all([
        scanConnectionsForNewEpisodes({
          newEpisodes: newEps,
          allEpisodes: allNow,
          existingConnections: connections,
          addConnection,
        }),
        scanEventsForNewEpisodes({
          newEpisodes: newEps,
          allEpisodes: allNow,
          characters,
          existingEvents: events,
          addEvent,
        }),
      ]);
      setScanStatus({ done: 1, total: 1, added: addedConns, addedEvents });
      setTimeout(() => setScanStatus(null), 4500);
    } catch (err) {
      console.error("post-save scan failed:", err);
      setScanStatus(null);
    }
  };

  // Wrap CRUD so modals close after saving, mirroring the original component.
  const handleAddEpisode = (ep) => {
    const created = addEpisode(ep);
    setShowAdd(null);
    // Fire-and-forget the connection scan (does nothing if disabled).
    runPostSaveScan([created]);
  };
  const handleAddCharacter = (ch) => { addCharacter(ch); setShowAdd(null); };
  const handleAddEvent = (ev) => { addEvent(ev); setShowAdd(null); };
  const handleDeleteCharacter = (id) => {
    deleteCharacter(id);
    if (selectedChar === id) setSelectedChar(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0a14] flex items-center justify-center">
        <div className="text-amber-200 font-body italic">Unfurling the tome...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0a14] text-amber-50 font-body">
      {/* Header */}
      <header className="px-5 pt-7 pb-3 border-b border-amber-900/40 bg-gradient-to-b from-[#1a0f1f] to-[#0f0a14]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-500/70 text-[10px] tracking-[0.3em] uppercase mb-1">
              <span>◆</span> The Chronicler's Tome <span>◆</span>
            </div>
            <h1 className="text-2xl text-amber-100 tracking-wide font-display font-bold">Critical Role</h1>
          </div>
          <SettingsMenu
            onExport={doExport}
            onImport={doImport}
            autoScan={autoScan}
            onAutoScanChange={setAutoScanPersisted}
          />
        </div>
        {scanStatus && (
          <div className="mt-2 text-amber-300/80 text-xs font-mono" role="status">
            {scanStatus.added != null
              ? `✓ Added ${scanStatus.added} connection${scanStatus.added === 1 ? "" : "s"}` +
                (scanStatus.addedEvents != null
                  ? ` + ${scanStatus.addedEvents} event${scanStatus.addedEvents === 1 ? "" : "s"}`
                  : "")
              : `Filling in the graph…`}
          </div>
        )}
      </header>

      {/* Campaign pills */}
      <div className="overflow-x-auto border-b border-amber-900/30 bg-[#140a1a]">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {CAMPAIGNS.map((c) => {
            const active = activeCampaign === c.id;
            const epCount = episodes.filter((e) => e.campaign === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCampaign(c.id);
                  setSelectedChar(null);
                  setExpandedEp(null);
                }}
                className={`px-3.5 py-1.5 rounded-full border text-sm whitespace-nowrap transition-all font-display tracking-wider ${
                  active
                    ? "border-transparent text-[#0f0a14] font-semibold"
                    : "border-amber-900/40 text-amber-200/60 hover:text-amber-200"
                }`}
                style={{ backgroundColor: active ? c.accent : "transparent" }}
              >
                {c.short} <span className="opacity-70">· {c.name}</span>
                {epCount > 0 && (
                  <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "opacity-50"}`}>
                    ({epCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tabs (within campaign) */}
      <nav className="sticky top-0 z-10 bg-[#0f0a14]/95 backdrop-blur border-b border-amber-900/40">
        <div className="flex">
          {[
            { id: "episodes", label: "Episodes", icon: BookOpen, count: campEpisodes.length },
            { id: "characters", label: "Characters", icon: Users, count: campCharacters.length },
            { id: "timeline", label: "Timeline", icon: Clock, count: campEvents.length },
            { id: "graph", label: "Graph", icon: Share2, count: campConnections.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setView(tab.id);
                  setSelectedChar(null);
                }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active ? "text-amber-300" : "text-amber-200/40"
                }`}
                style={{ borderBottom: active ? `2px solid ${currentCamp.accent}` : "2px solid transparent" }}
              >
                <Icon size={16} />
                <span className="text-[10px] tracking-widest uppercase font-display">
                  {tab.label}
                  {tab.count > 0 && <span className="opacity-50 ml-1">({tab.count})</span>}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="px-4 py-5 pb-24">
        {view === "episodes" && (
          <>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAdd("episode-range")}
                className="text-amber-300/70 hover:text-amber-200 text-xs underline underline-offset-2"
              >
                Log a range of episodes…
              </button>
            </div>
          <EpisodesView
            campaign={currentCamp}
            episodes={campEpisodes}
            expandedEp={expandedEp}
            setExpandedEp={setExpandedEp}
            deleteEpisode={deleteEpisode}
            updateEpisode={updateEpisode}
            connections={connections}
            allEpisodes={episodes}
            addConnection={addConnection}
            deleteConnection={deleteConnection}
            onAddCharacters={addIntroducedCharacters}
          />
          </>
        )}

        {view === "characters" && !selectedChar && (
          <CharactersView
            characters={campCharacters}
            setSelectedChar={setSelectedChar}
            deleteCharacter={handleDeleteCharacter}
            campaign={currentCamp}
            progress={progress}
            onAddCharacters={addIntroducedCharacters}
          />
        )}

        {view === "characters" && selectedChar && (
          <CharacterDetail
            character={characters.find((c) => c.id === selectedChar)}
            events={events.filter((e) => e.characterId === selectedChar)}
            episodes={campEpisodes}
            onBack={() => setSelectedChar(null)}
            onDeleteEvent={deleteEvent}
            updateCharacter={updateCharacter}
            progress={progress}
          />
        )}

        {view === "timeline" && (
          <TimelineView
            events={campEvents}
            characters={campCharacters}
            episodes={campEpisodes}
            deleteEvent={deleteEvent}
          />
        )}

        {view === "graph" && (
          <GraphView
            episodes={episodes}
            connections={connections}
            activeCampaign={activeCampaign}
            onJumpToEpisode={jumpToEpisode}
          />
        )}
      </main>

      {/* FAB — hidden on the graph view, which has no add action */}
      {view !== "graph" && (
      <button
        onClick={() => {
          if (view === "episodes") setShowAdd("episode");
          else if (view === "characters" && !selectedChar) setShowAdd("character");
          else if (view === "characters" && selectedChar) setShowAdd("event-for-" + selectedChar);
          else if (view === "timeline") setShowAdd("event");
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[#1a0f1f] shadow-lg flex items-center justify-center hover:scale-105 transition-all active:scale-95"
        style={{ backgroundColor: currentCamp.accent, boxShadow: `0 8px 24px ${currentCamp.accent}40` }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
      )}

      {/* Modals */}
      {showAdd === "episode" && (
        <AddEpisodeModal
          campaign={activeCampaign}
          onSave={handleAddEpisode}
          onClose={() => setShowAdd(null)}
          onAddCharacters={addIntroducedCharacters}
        />
      )}
      {showAdd === "character" && (
        <AddCharacterModal
          campaign={activeCampaign}
          onSave={handleAddCharacter}
          onClose={() => setShowAdd(null)}
        />
      )}
      {showAdd === "event" && (
        <AddEventModal
          characters={campCharacters}
          episodes={campEpisodes}
          onSave={handleAddEvent}
          onClose={() => setShowAdd(null)}
        />
      )}
      {showAdd?.startsWith("event-for-") && (
        <AddEventModal
          characters={campCharacters}
          episodes={campEpisodes}
          prefilledCharId={showAdd.replace("event-for-", "")}
          onSave={handleAddEvent}
          onClose={() => setShowAdd(null)}
        />
      )}
      {showAdd === "episode-range" && (
        <AddEpisodesBatchModal
          campaign={activeCampaign}
          existingEpisodeNums={campEpisodes.map((e) => e.episodeNum)}
          onClose={() => setShowAdd(null)}
          onCommit={(items) => {
            // Create each episode, queue characters per-episode (deduped by
            // addIntroducedCharacters), then trigger the scan pass across the
            // whole batch at once.
            const created = items.map((it) => {
              const ep = addEpisode({
                campaign: activeCampaign,
                episodeNum: it.episodeNum,
                title: it.title,
                dateWatched: new Date().toISOString().slice(0, 10),
                summary: it.summary,
                notes: "",
                youtubeUrl: it.youtubeUrl,
              });
              if (it.characters?.length) {
                addIntroducedCharacters(
                  it.characters.map((c) => ({ ...c, firstEpisode: it.episodeNum }))
                );
              }
              return ep;
            });
            setShowAdd(null);
            runPostSaveScan(created);
          }}
        />
      )}
    </div>
  );
}
