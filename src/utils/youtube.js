import { campaignById } from "../constants.js";

// Extract a YouTube video ID from any common URL format
export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/v\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function youtubeSearchUrl(campaign, episodeNum, title) {
  const camp = campaignById(campaign);
  const q = `${camp?.searchName || "Critical Role"} Episode ${episodeNum}${title ? " " + title : ""}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
