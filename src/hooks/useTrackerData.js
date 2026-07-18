import { useState, useEffect, useCallback, useRef } from "react";
import { loadData, saveData, parseImport, exportData } from "../storage.js";

// Monotonic-ish unique id. Date.now() alone can collide when two records are
// created in the same millisecond (e.g. a batch import), so we mix in a counter.
let idCounter = 0;
function newId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

// Single source of truth for the whole app. Replaces the original component's
// two useEffects (load on mount, autosave on change) and centralizes every
// mutation so cascade rules live in one place.
export function useTrackerData() {
  const [data, setData] = useState(null); // null = still loading
  const loadedRef = useRef(false);

  // Load once on mount.
  useEffect(() => {
    setData(loadData());
    loadedRef.current = true;
  }, []);

  // Autosave whenever data changes, but never before the initial load has
  // populated state (otherwise we'd overwrite storage with an empty blob).
  useEffect(() => {
    if (!loadedRef.current || data == null) return;
    saveData(data);
  }, [data]);

  const loading = data == null;

  // --- Episodes ---
  const addEpisode = useCallback((fields) => {
    const episode = { id: newId(), summary: "", ...fields };
    setData((d) => ({ ...d, episodes: [...d.episodes, episode] }));
    return episode;
  }, []);

  const updateEpisode = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep) => (ep.id === id ? { ...ep, ...patch } : ep)),
    }));
  }, []);

  // Deleting an episode cascades to its events (character timeline entries) and
  // any connections that reference it from either end.
  const deleteEpisode = useCallback((id) => {
    setData((d) => ({
      ...d,
      episodes: d.episodes.filter((ep) => ep.id !== id),
      events: d.events.filter((ev) => ev.episodeId !== id),
      connections: d.connections.filter(
        (c) => c.fromEpisodeId !== id && c.toEpisodeId !== id
      ),
    }));
  }, []);

  // --- Characters ---
  const addCharacter = useCallback((fields) => {
    const character = { id: newId(), stats: "", ...fields };
    setData((d) => ({ ...d, characters: [...d.characters, character] }));
    return character;
  }, []);

  const updateCharacter = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      characters: d.characters.map((ch) =>
        ch.id === id ? { ...ch, ...patch } : ch
      ),
    }));
  }, []);

  // Deleting a character cascades to its events.
  const deleteCharacter = useCallback((id) => {
    setData((d) => ({
      ...d,
      characters: d.characters.filter((ch) => ch.id !== id),
      events: d.events.filter((ev) => ev.characterId !== id),
    }));
  }, []);

  // --- Events (character x episode) ---
  const addEvent = useCallback((fields) => {
    const event = { id: newId(), ...fields };
    setData((d) => ({ ...d, events: [...d.events, event] }));
    return event;
  }, []);

  const deleteEvent = useCallback((id) => {
    setData((d) => ({ ...d, events: d.events.filter((ev) => ev.id !== id) }));
  }, []);

  // --- Connections (episode <-> episode) ---
  const addConnection = useCallback((fields) => {
    const connection = { id: newId(), ...fields };
    setData((d) => ({ ...d, connections: [...d.connections, connection] }));
    return connection;
  }, []);

  const deleteConnection = useCallback((id) => {
    setData((d) => ({
      ...d,
      connections: d.connections.filter((c) => c.id !== id),
    }));
  }, []);

  // --- Whole-dataset ops (export / import) ---
  const doExport = useCallback(() => {
    if (data) exportData(data);
  }, [data]);

  const doImport = useCallback((text) => {
    const imported = parseImport(text); // throws on invalid input
    setData(imported);
  }, []);

  return {
    loading,
    episodes: data?.episodes ?? [],
    characters: data?.characters ?? [],
    events: data?.events ?? [],
    connections: data?.connections ?? [],
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
  };
}
