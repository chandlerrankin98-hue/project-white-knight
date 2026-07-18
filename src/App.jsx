import { useState } from "react";
import { Plus, BookOpen, Users, Clock, Share2 } from "lucide-react";
import { CAMPAIGNS, campaignById } from "./constants.js";
import { useTrackerData } from "./hooks/useTrackerData.js";
import EpisodesView from "./views/EpisodesView.jsx";
import CharactersView from "./views/CharactersView.jsx";
import CharacterDetail from "./views/CharacterDetail.jsx";
import TimelineView from "./views/TimelineView.jsx";
import GraphView from "./views/GraphView.jsx";
import AddEpisodeModal from "./components/modals/AddEpisodeModal.jsx";
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

  // Wrap CRUD so modals close after saving, mirroring the original component.
  const handleAddEpisode = (ep) => { addEpisode(ep); setShowAdd(null); };
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
          <SettingsMenu onExport={doExport} onImport={doImport} />
        </div>
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
          />
        )}

        {view === "characters" && !selectedChar && (
          <CharactersView
            characters={campCharacters}
            setSelectedChar={setSelectedChar}
            deleteCharacter={handleDeleteCharacter}
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
    </div>
  );
}
