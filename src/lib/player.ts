import { getLatestHistoryFor, saveHistory } from "./localData";

const video = document.querySelector<HTMLVideoElement>("#video-player");

if (video) {
  const content = safeJson(video.dataset.content);
  const src = video.currentSrc || video.getAttribute("src") || "";

  if (src.endsWith(".m3u8") && !video.canPlayType("application/vnd.apple.mpegurl")) {
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;
      const hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
    });
  }

  setupSubtitle(video);

  const latest = getLatestHistoryFor(String(content.id), String(content.type));
  if (latest?.episode_id === String(content.episode_id) && latest.progress_seconds > 15) {
    video.currentTime = latest.progress_seconds;
  }

  const persist = () => {
    if (!Number.isFinite(video.currentTime) || video.currentTime < 1) return;
    saveHistory({
      id: String(content.id),
      type: String(content.type),
      episode_id: String(content.episode_id),
      episode_index: Number(content.episode_index),
      title: String(content.title),
      cover_url: content.cover_url,
      progress_seconds: Math.floor(video.currentTime),
      duration_seconds: Math.floor(video.duration || 0),
      watched_at: new Date().toISOString()
    });
  };

  const interval = window.setInterval(persist, 12000);
  video.addEventListener("pause", persist);
  window.addEventListener("pagehide", () => {
    persist();
    window.clearInterval(interval);
  });
}

function safeJson(value: string | undefined) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function setupSubtitle(video: HTMLVideoElement) {
  const track = video.querySelector<HTMLTrackElement>("track");
  const subtitleUrl = track?.getAttribute("src")?.trim();

  if (!track || !subtitleUrl || ["null", "undefined", "none", "-"].includes(subtitleUrl.toLowerCase())) {
    track?.remove();
    return;
  }

  const activateFirstTrack = () => {
    if (video.textTracks.length > 0) {
      video.textTracks[0].mode = "showing";
    }
  };

  if (subtitleUrl.endsWith(".vtt")) {
    video.addEventListener("loadedmetadata", activateFirstTrack, { once: true });
    return;
  }

  fetch(subtitleUrl)
    .then((response) => {
      if (!response.ok) throw new Error("Subtitle unavailable");
      return response.text();
    })
    .then((subtitle) => {
      const objectUrl = URL.createObjectURL(new Blob([toVtt(subtitle)], { type: "text/vtt" }));
      track.setAttribute("src", objectUrl);
      track.track.mode = "showing";
      window.addEventListener("pagehide", () => URL.revokeObjectURL(objectUrl), { once: true });
    })
    .catch(() => {
      track.remove();
    });
}

function toVtt(subtitle: string) {
  const normalized = subtitle.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.startsWith("WEBVTT")) return normalized;
  return `WEBVTT\n\n${normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
}
