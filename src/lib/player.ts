import { getLatestHistoryFor, saveHistory } from "./localData";

const video = document.querySelector<HTMLVideoElement>("#video-player");

if (video) {
  const content = JSON.parse(video.dataset.content || "{}");
  const src = video.currentSrc || video.getAttribute("src") || "";

  if (src.endsWith(".m3u8") && !video.canPlayType("application/vnd.apple.mpegurl")) {
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;
      const hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
    });
  }

  // Handle subtitle: convert SRT to VTT if needed, inject as object URL
  const track = video.querySelector<HTMLTrackElement>("track");
  if (track) {
    const subtitleUrl = track.getAttribute("src") || "";
    if (subtitleUrl && (subtitleUrl.endsWith(".srt") || !subtitleUrl.endsWith(".vtt"))) {
      fetch(subtitleUrl)
        .then((res) => res.text())
        .then((srt) => {
          // SRT → VTT conversion
          const vtt = "WEBVTT\n\n" + srt
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2") // comma to dot for timestamp
            .trim();
          const blob = new Blob([vtt], { type: "text/vtt" });
          const objectUrl = URL.createObjectURL(blob);
          track.setAttribute("src", objectUrl);
          track.track.mode = "showing";
        })
        .catch(() => {
          // Subtitle fetch failed, silently ignore
        });
    } else if (subtitleUrl.endsWith(".vtt")) {
      // VTT native — just activate it
      video.addEventListener("loadedmetadata", () => {
        if (video.textTracks.length > 0) {
          video.textTracks[0].mode = "showing";
        }
      });
    }
  }

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
