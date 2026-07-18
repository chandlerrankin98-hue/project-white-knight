import EpisodeCard from "../components/EpisodeCard.jsx";
import { EmptyState } from "../components/ui.jsx";

export default function EpisodesView({
  campaign,
  episodes,
  expandedEp,
  setExpandedEp,
  deleteEpisode,
  updateEpisode,
  connections,
  allEpisodes,
  addConnection,
  deleteConnection,
}) {
  if (episodes.length === 0) {
    return <EmptyState text={`No episodes in ${campaign.name} yet. Tap + to log one.`} />;
  }

  const sorted = [...episodes].sort(
    (a, b) => (parseInt(a.episodeNum) || 0) - (parseInt(b.episodeNum) || 0)
  );

  return (
    <div className="space-y-2">
      {sorted.map((ep) => (
        <EpisodeCard
          key={ep.id}
          ep={ep}
          campaign={campaign}
          expanded={expandedEp === ep.id}
          onToggle={() => setExpandedEp(expandedEp === ep.id ? null : ep.id)}
          deleteEpisode={deleteEpisode}
          updateEpisode={updateEpisode}
          connections={connections}
          allEpisodes={allEpisodes}
          addConnection={addConnection}
          deleteConnection={deleteConnection}
        />
      ))}
    </div>
  );
}
