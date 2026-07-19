// Shared helper for applying auto-detected connections. Used by both the
// AutoConnectButton (single-episode preview flow) and App's post-save
// bidirectional scan (batch and single). Dedups against existing connections by
// (fromEpisodeId, toEpisodeId, type) so re-running never creates a duplicate.

// existing: current connections array from the tracker store.
// suggestions: [{ fromEpisodeId, toEpisodeId, type, note }]
// addConnection: the CRUD action from useTrackerData.
// Returns the number of connections actually added.
export function applyConnections(existing, suggestions, addConnection) {
  const seen = new Set(
    existing.map((c) => `${c.fromEpisodeId}::${c.toEpisodeId}::${c.type}`)
  );
  let added = 0;
  for (const s of suggestions) {
    if (!s.fromEpisodeId || !s.toEpisodeId || s.fromEpisodeId === s.toEpisodeId) continue;
    const key = `${s.fromEpisodeId}::${s.toEpisodeId}::${s.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    addConnection({
      fromEpisodeId: s.fromEpisodeId,
      toEpisodeId: s.toEpisodeId,
      type: s.type,
      note: s.note || "",
    });
    added += 1;
  }
  return added;
}
