import { Heart, Skull, HelpCircle } from "lucide-react";

export const CAMPAIGNS = [
  { id: "c1", name: "Vox Machina",  short: "C1", accent: "#d97706", searchName: "Critical Role Campaign 1" },
  { id: "c2", name: "Mighty Nein",  short: "C2", accent: "#7c3aed", searchName: "Critical Role Campaign 2" },
  { id: "c3", name: "Bells Hells",  short: "C3", accent: "#dc2626", searchName: "Critical Role Campaign 3" },
  { id: "c4", name: "Age of Umbra", short: "C4", accent: "#0891b2", searchName: "Critical Role Age of Umbra" },
  { id: "other", name: "One-Shots", short: "OS", accent: "#65a30d", searchName: "Critical Role one-shot" },
];

export const STATUSES = [
  { id: "alive",   label: "Alive",   icon: Heart,       color: "text-emerald-400" },
  { id: "dead",    label: "Dead",    icon: Skull,       color: "text-rose-400" },
  { id: "unknown", label: "Unknown", icon: HelpCircle,  color: "text-amber-400" },
];

// Kinds of link between two episodes, used by the connections panel and the
// graph view. `color` is the edge/badge color (hex so the canvas graph can use
// it directly); `text`/`bg` are Tailwind classes for the badge chip.
export const CONNECTION_TYPES = [
  { id: "foreshadow",    label: "Foreshadow",     color: "#818cf8", text: "text-indigo-300",  bg: "bg-indigo-500/15" },
  { id: "callback",      label: "Callback",       color: "#fbbf24", text: "text-amber-300",   bg: "bg-amber-500/15" },
  { id: "plot-thread",   label: "Plot thread",    color: "#fb7185", text: "text-rose-300",    bg: "bg-rose-500/15" },
  { id: "character-arc", label: "Character arc",  color: "#34d399", text: "text-emerald-300", bg: "bg-emerald-500/15" },
  { id: "location",      label: "Location",       color: "#22d3ee", text: "text-cyan-300",    bg: "bg-cyan-500/15" },
  { id: "other",         label: "Other",          color: "#94a3b8", text: "text-slate-300",   bg: "bg-slate-500/15" },
];

export const campaignById = (id) => CAMPAIGNS.find((c) => c.id === id);
export const statusById = (id) => STATUSES.find((s) => s.id === id);
export const connectionTypeById = (id) =>
  CONNECTION_TYPES.find((t) => t.id === id) || CONNECTION_TYPES[CONNECTION_TYPES.length - 1];
