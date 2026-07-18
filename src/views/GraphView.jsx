import { useRef, useState, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { X, ArrowRight } from "lucide-react";
import { CAMPAIGNS, campaignById, connectionTypeById, CONNECTION_TYPES } from "../constants.js";
import { EmptyState } from "../components/ui.jsx";

// Interactive force-directed graph of episode connections. Nodes are episodes
// (colored by campaign, sized by how many connections touch them); links are
// connections (colored by type). Tap a node to inspect it and jump to it.
export default function GraphView({ episodes, connections, activeCampaign, onJumpToEpisode }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null); // episode id

  // Track container size so the canvas fills the available space responsively.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Which episodes are in scope: the active campaign, or everything.
  const visibleEpisodes = useMemo(
    () => (showAll ? episodes : episodes.filter((e) => e.campaign === activeCampaign)),
    [episodes, activeCampaign, showAll]
  );
  const visibleIds = useMemo(() => new Set(visibleEpisodes.map((e) => e.id)), [visibleEpisodes]);

  // Connections with both endpoints visible.
  const visibleConnections = useMemo(
    () => connections.filter((c) => visibleIds.has(c.fromEpisodeId) && visibleIds.has(c.toEpisodeId)),
    [connections, visibleIds]
  );

  // Degree per episode (for node sizing).
  const degree = useMemo(() => {
    const d = {};
    visibleConnections.forEach((c) => {
      d[c.fromEpisodeId] = (d[c.fromEpisodeId] || 0) + 1;
      d[c.toEpisodeId] = (d[c.toEpisodeId] || 0) + 1;
    });
    return d;
  }, [visibleConnections]);

  // Build graph data. Rebuild only when the underlying sets change so the
  // simulation isn't reset on unrelated renders (react-force-graph mutates
  // these objects with x/y, so we key them by id + a signature).
  const graphData = useMemo(() => {
    const nodes = visibleEpisodes.map((e) => {
      const camp = campaignById(e.campaign);
      return {
        id: e.id,
        label: `${camp?.short}E${e.episodeNum}`,
        title: e.title,
        color: camp?.accent || "#d97706",
        deg: degree[e.id] || 0,
      };
    });
    const links = visibleConnections.map((c) => ({
      source: c.fromEpisodeId,
      target: c.toEpisodeId,
      color: connectionTypeById(c.type).color,
    }));
    return { nodes, links };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleEpisodes, visibleConnections, degree]);

  const selectedEp = selected ? episodes.find((e) => e.id === selected) : null;
  const selectedCamp = selectedEp ? campaignById(selectedEp.campaign) : null;

  if (visibleEpisodes.length === 0) {
    return (
      <EmptyState
        text={
          showAll
            ? "No episodes logged yet. Add some, then link them to see the web."
            : "No episodes in this campaign yet. Add some, then link them."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls + legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="flex items-center gap-2 text-amber-200/70 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => { setShowAll(e.target.checked); setSelected(null); }}
            className="accent-amber-500"
          />
          All campaigns
        </label>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {CONNECTION_TYPES.map((t) => (
            <span key={t.id} className="flex items-center gap-1 text-[10px] text-amber-200/60">
              <span className="inline-block w-3 h-[2px] rounded" style={{ backgroundColor: t.color }} />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {visibleConnections.length === 0 && (
        <div className="text-amber-200/50 italic text-sm text-center py-2">
          No connections yet — open an episode and use the Connections panel to link episodes.
          Nodes below are your episodes.
        </div>
      )}

      {/* Graph canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg border border-amber-900/30 bg-[#0b0710] overflow-hidden"
        style={{ height: "70dvh", touchAction: "none" }}
      >
        {size.width > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor="#0b0710"
            cooldownTicks={100}
            linkColor={(l) => l.color}
            linkWidth={1.5}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            onNodeClick={(node) => setSelected(node.id)}
            onBackgroundClick={() => setSelected(null)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const r = 5 + Math.min(node.deg, 8) * 1.5;
              const isSel = node.id === selected;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = node.color;
              ctx.fill();
              if (isSel) {
                ctx.lineWidth = 2 / globalScale;
                ctx.strokeStyle = "#fef3c7";
                ctx.stroke();
              }
              const fontSize = Math.max(10 / globalScale, 3);
              ctx.font = `${fontSize}px 'Cinzel', serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#fdf6e3";
              ctx.fillText(node.label, node.x, node.y + r + fontSize);
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const r = 5 + Math.min(node.deg, 8) * 1.5;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
              ctx.fill();
            }}
          />
        )}

        {/* Node inspector side panel */}
        {selectedEp && (
          <div className="absolute top-3 right-3 left-3 sm:left-auto sm:w-72 bg-[#1a0f1f]/95 backdrop-blur border border-amber-900/50 rounded-lg p-3 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-mono" style={{ color: selectedCamp?.accent }}>
                  {selectedCamp?.short}E{selectedEp.episodeNum}
                </div>
                <div className="text-amber-100 font-display">{selectedEp.title}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-amber-200/60 hover:text-amber-100">
                <X size={16} />
              </button>
            </div>
            {selectedEp.summary ? (
              <p className="text-amber-100/80 text-sm mt-2 line-clamp-5 whitespace-pre-wrap">
                {selectedEp.summary}
              </p>
            ) : (
              <p className="text-amber-200/40 italic text-sm mt-2">No summary yet.</p>
            )}
            <button
              onClick={() => onJumpToEpisode(selectedEp.id)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-[#1a0f1f] text-xs font-semibold py-2 rounded uppercase tracking-widest font-display"
            >
              Open episode <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
