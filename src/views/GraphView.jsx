import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { X, ArrowRight, Maximize2 } from "lucide-react";
import { campaignById, connectionTypeById, CONNECTION_TYPES } from "../constants.js";
import { EmptyState } from "../components/ui.jsx";

// Interactive force-directed graph of episode connections. Nodes are episodes
// (colored by campaign, sized by how many connections touch them); links are
// connections (colored by type). Tap a node to inspect it and jump to it.
//
// Readability polish (over the initial version): curved multi-edges so links
// between the same pair fan out; hover/select dims non-adjacent nodes and
// edges; the legend chips act as type filters; a Fit-to-view button reframes.
export default function GraphView({ episodes, connections, activeCampaign, onJumpToEpisode }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null); // episode id
  const [hovered, setHovered] = useState(null);   // episode id
  // Connection types the user has toggled OFF via the legend.
  const [hiddenTypes, setHiddenTypes] = useState(() => new Set());

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

  // Connections with both endpoints visible AND type not filtered out.
  const visibleConnections = useMemo(
    () =>
      connections.filter(
        (c) =>
          visibleIds.has(c.fromEpisodeId) &&
          visibleIds.has(c.toEpisodeId) &&
          !hiddenTypes.has(c.type)
      ),
    [connections, visibleIds, hiddenTypes]
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

  // Curve multi-edges: for each unordered pair, distribute curvature across
  // [-0.4, +0.4] so overlapping links fan out instead of stacking on the same line.
  const curvatureByLinkKey = useMemo(() => {
    const bucket = new Map(); // key: `min::max`, val: array of connection ids
    for (const c of visibleConnections) {
      const key = c.fromEpisodeId < c.toEpisodeId
        ? `${c.fromEpisodeId}::${c.toEpisodeId}`
        : `${c.toEpisodeId}::${c.fromEpisodeId}`;
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(c);
    }
    const out = new Map();
    for (const [, list] of bucket) {
      const n = list.length;
      if (n === 1) {
        out.set(list[0].id, 0);
      } else {
        // Symmetric distribution around 0: e.g. n=2 -> [-0.25, 0.25]; n=3 -> [-0.3, 0, 0.3]
        const max = 0.4;
        list.forEach((c, i) => {
          const t = (i - (n - 1) / 2) / Math.max(1, n - 1); // -0.5..0.5
          out.set(c.id, t * 2 * max);
        });
      }
    }
    return out;
  }, [visibleConnections]);

  // Adjacency (for dim/highlight): map node id -> set of neighbor ids.
  const adjacency = useMemo(() => {
    const m = new Map();
    for (const c of visibleConnections) {
      if (!m.has(c.fromEpisodeId)) m.set(c.fromEpisodeId, new Set());
      if (!m.has(c.toEpisodeId)) m.set(c.toEpisodeId, new Set());
      m.get(c.fromEpisodeId).add(c.toEpisodeId);
      m.get(c.toEpisodeId).add(c.fromEpisodeId);
    }
    return m;
  }, [visibleConnections]);

  const focus = selected || hovered; // active node for highlight
  const focusNeighbors = useMemo(() => {
    if (!focus) return null;
    const n = new Set(adjacency.get(focus) || []);
    n.add(focus);
    return n;
  }, [focus, adjacency]);

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
      id: c.id,
      source: c.fromEpisodeId,
      target: c.toEpisodeId,
      type: c.type,
      color: connectionTypeById(c.type).color,
      curvature: curvatureByLinkKey.get(c.id) ?? 0,
    }));
    return { nodes, links };
  }, [visibleEpisodes, visibleConnections, degree, curvatureByLinkKey]);

  // Tune the underlying d3 forces once the ref is available (and each time the
  // graph data changes so the sim gets a fresh nudge).
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (typeof fg.d3Force === "function") {
      const charge = fg.d3Force("charge");
      if (charge) charge.strength(-180);
      const link = fg.d3Force("link");
      if (link) link.distance(70);
      fg.d3ReheatSimulation?.();
    }
  }, [graphData]);

  const fitToView = useCallback(() => {
    fgRef.current?.zoomToFit(400, 40);
  }, []);

  const toggleType = (typeId) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      next.has(typeId) ? next.delete(typeId) : next.add(typeId);
      return next;
    });
  };

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

  // Small helpers to compute per-node/per-link display opacity.
  const nodeAlpha = (id) => (!focusNeighbors ? 1 : focusNeighbors.has(id) ? 1 : 0.18);
  const linkAlpha = (l) => {
    if (!focusNeighbors) return 1;
    const src = typeof l.source === "object" ? l.source.id : l.source;
    const tgt = typeof l.target === "object" ? l.target.id : l.target;
    return focusNeighbors.has(src) && focusNeighbors.has(tgt) ? 1 : 0.12;
  };

  // Convert a hex color + alpha into an rgba string for canvas fills/strokes.
  const withAlpha = (hex, a) => {
    const h = hex.replace("#", "");
    const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
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
        <button
          type="button"
          onClick={fitToView}
          className="inline-flex items-center gap-1 text-amber-300/80 hover:text-amber-200 text-xs px-2 py-1 rounded border border-amber-900/40 hover:bg-amber-500/10"
          aria-label="Fit graph to view"
        >
          <Maximize2 size={12} /> Fit
        </button>
      </div>

      {/* Legend / filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {CONNECTION_TYPES.map((t) => {
          const on = !hiddenTypes.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleType(t.id)}
              className={`inline-flex items-center gap-1.5 text-[10px] px-1.5 py-1 rounded border transition-colors ${
                on
                  ? "border-amber-900/40 text-amber-200/80"
                  : "border-amber-900/20 text-amber-200/30 line-through"
              }`}
              title={on ? "Click to hide this type" : "Click to show this type"}
              aria-pressed={on}
            >
              <span
                className="inline-block w-3 h-[2px] rounded"
                style={{ backgroundColor: on ? t.color : "#4b5563" }}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      {visibleConnections.length === 0 && (
        <div className="text-amber-200/50 italic text-sm text-center py-2">
          {connections.length === 0
            ? "No connections yet — open an episode and use the Connections panel to link episodes."
            : "All connection types are hidden. Tap a legend chip to show them."}
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
            d3AlphaDecay={0.03}
            linkCurvature={(l) => l.curvature}
            linkColor={(l) => withAlpha(l.color, linkAlpha(l))}
            linkWidth={(l) => (focusNeighbors && linkAlpha(l) === 1 ? 2 : 1.25)}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={0.85}
            linkDirectionalArrowColor={(l) => withAlpha(l.color, linkAlpha(l))}
            onNodeClick={(node) => setSelected(node.id)}
            onNodeHover={(node) => setHovered(node ? node.id : null)}
            onBackgroundClick={() => setSelected(null)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const r = 5 + Math.min(node.deg, 8) * 1.5;
              const isSel = node.id === selected;
              const a = nodeAlpha(node.id);
              // Node fill
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = withAlpha(node.color, a);
              ctx.fill();
              if (isSel) {
                ctx.lineWidth = 2 / globalScale;
                ctx.strokeStyle = withAlpha("#fef3c7", a);
                ctx.stroke();
              }
              // Label with dark outline for legibility over links
              const fontSize = Math.max(10 / globalScale, 3);
              ctx.font = `${fontSize}px 'Cinzel', serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              const label = node.label;
              const y = node.y + r + fontSize;
              ctx.lineWidth = 3 / globalScale;
              ctx.strokeStyle = withAlpha("#0b0710", a);
              ctx.strokeText(label, node.x, y);
              ctx.fillStyle = withAlpha("#fdf6e3", a);
              ctx.fillText(label, node.x, y);
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
