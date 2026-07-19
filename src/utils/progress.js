// Spoiler-gating helpers. A campaign's "progress" is inferred from the highest
// episode number logged in that campaign — that's the boundary past which
// character revelations stay hidden.

export function campaignProgress(episodes, campaignId) {
  return episodes
    .filter((e) => e.campaign === campaignId)
    .reduce((max, e) => Math.max(max, parseInt(e.episodeNum) || 0), 0);
}

// Should a character's spoiler tier be shown at the given progress?
// - No spoiler content → always "revealed" (nothing to hide).
// - Known reveal episode → revealed once progress reaches it.
// - Unknown reveal episode (null) → never auto-revealed; requires a manual tap.
export function isSpoilerRevealed(character, progress) {
  if (!character?.spoilerInfo) return true;
  if (character.spoilerRevealedEpisode == null) return false;
  return progress >= character.spoilerRevealedEpisode;
}
