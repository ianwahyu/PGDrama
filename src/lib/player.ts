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

  const subtitleApi = setupSubtitles(video);
  setupCustomControls(video);
  setupPlaybackShortcuts(video, subtitleApi);
  setupMediaSession(video);
  setupAutoNext(video);

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

function setupSubtitles(video: HTMLVideoElement) {
  const tracks = Array.from(video.querySelectorAll<HTMLTrackElement>("track"));
  const control = document.querySelector<HTMLSelectElement>("[data-subtitle-control]");
  const validTracks = tracks.filter((track) => {
    const subtitleUrl = track.getAttribute("src")?.trim();
    const isValid = subtitleUrl && !["null", "undefined", "none", "-"].includes(subtitleUrl.toLowerCase());
    if (!isValid) track.remove();
    return isValid;
  });

  if (!validTracks.length) {
    control?.closest("label")?.remove();
    document.querySelector<HTMLButtonElement>('[data-player-action="subtitle"]')?.setAttribute("disabled", "true");
    return {
      toggle: () => undefined,
      setActive: () => undefined
    };
  }

  const setActiveTrack = (value = control?.value || "0") => {
    Array.from(video.textTracks).forEach((track) => {
      track.mode = "disabled";
    });

    if (value === "off") return;

    const selected = Number(value);
    if (Number.isInteger(selected) && video.textTracks[selected]) {
      video.textTracks[selected].mode = "showing";
    }
  };

  validTracks.forEach((track, index) => {
    const subtitleUrl = track.getAttribute("src")?.trim() || "";
    if (subtitleUrl.endsWith(".vtt")) return;

    fetch(subtitleUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Subtitle unavailable");
        return response.text();
      })
      .then((subtitle) => {
        const objectUrl = URL.createObjectURL(new Blob([toVtt(subtitle)], { type: "text/vtt" }));
        track.setAttribute("src", objectUrl);
        window.addEventListener("pagehide", () => URL.revokeObjectURL(objectUrl), { once: true });
        if (control?.value === String(index)) setActiveTrack(control.value);
      })
      .catch(() => {
        const option = control?.querySelector<HTMLOptionElement>(`option[value="${index}"]`);
        if (option) {
          option.disabled = true;
          option.textContent = `${option.textContent || "Subtitle"} tidak tersedia`;
        }
        if (control?.value === String(index)) {
          control.value = "off";
          setActiveTrack("off");
        }
      });
  });

  video.addEventListener("loadedmetadata", () => setActiveTrack(control?.value || "0"), { once: true });
  control?.addEventListener("change", () => setActiveTrack(control.value));

  return {
    toggle: () => {
      if (!control) return;
      control.value = control.value === "off" ? "0" : "off";
      setActiveTrack(control.value);
    },
    setActive: setActiveTrack
  };
}

function setupCustomControls(video: HTMLVideoElement) {
  const shell = video.closest<HTMLElement>("[data-player-shell]");
  const seek = document.querySelector<HTMLInputElement>("[data-player-seek]");
  const volume = document.querySelector<HTMLInputElement>("[data-player-volume]");
  const speed = document.querySelector<HTMLSelectElement>("[data-player-speed]");
  const time = document.querySelector<HTMLElement>("[data-player-time]");
  const playButtons = document.querySelectorAll<HTMLButtonElement>('[data-player-action="play"]');
  const rotateButtons = document.querySelectorAll<HTMLButtonElement>('[data-player-action="rotate"]');
  const fullscreenButtons = document.querySelectorAll<HTMLButtonElement>('[data-player-action="fullscreen"]');
  const controlsBar = document.querySelector<HTMLElement>("[data-custom-controls]");

  let hideTimer: number | undefined;
  let controlsVisible = true;

  // ── Show / Hide helpers ──
  const setControlsVisible = (visible: boolean) => {
    if (!shell) return;
    controlsVisible = visible;
    if (visible) {
      shell.classList.remove("controls-hidden");
    } else {
      shell.classList.add("controls-hidden");
    }
  };

  const scheduleHide = () => {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (!video.paused) {
        setControlsVisible(false);
      }
    }, 2800);
  };

  const showControls = (persist = false) => {
    setControlsVisible(true);
    if (hideTimer) window.clearTimeout(hideTimer);
    if (!persist && !video.paused) {
      scheduleHide();
    }
  };

  // ── Play / Pause ──
  const togglePlay = () => {
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const syncPlay = () => {
    document.querySelectorAll("[data-icon-play]").forEach((el) => {
      (el as HTMLElement).style.display = video.paused ? "" : "none";
    });
    document.querySelectorAll("[data-icon-pause]").forEach((el) => {
      (el as HTMLElement).style.display = video.paused ? "none" : "";
    });

    if (video.paused) {
      showControls(true);
    } else {
      showControls(false);
    }
  };

  // ── Seek / Time ──
  const syncTime = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    if (seek) {
      seek.value = duration ? String((current / duration) * 100) : "0";
    }
    if (time) {
      time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }
  };

  // ── Fullscreen ──
  const enterFullscreen = async () => {
    if (!shell) return;
    try {
      await shell.requestFullscreen();
    } catch {
      const webkitVideo = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
        webkitSupportsFullscreen?: boolean;
      };
      if (webkitVideo.webkitSupportsFullscreen !== false && webkitVideo.webkitEnterFullscreen) {
        webkitVideo.webkitEnterFullscreen();
      }
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  // ── Rotate (mobile landscape) ──
  // Uses Fullscreen + screen.orientation.lock for a proper landscape experience.
  // Falls back to CSS rotation only as last resort.
  let isRotated = false;

  const toggleRotate = async () => {
    if (!shell) return;

    if (isRotated) {
      // Exit rotated state
      isRotated = false;
      shell.classList.remove("is-rotated");
      document.body.classList.remove("body-player-rotated");

      // Try to unlock orientation
      try {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        orientation.unlock?.();
      } catch { /* ignore */ }

      // Exit fullscreen if we entered it
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
    } else {
      // Enter rotated/landscape state
      isRotated = true;

      // Strategy 1: Fullscreen + orientation lock (best experience)
      try {
        await shell.requestFullscreen();
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
        await orientation.lock?.("landscape");
        // Fullscreen + landscape lock succeeded, no CSS hack needed
        return;
      } catch {
        // Fullscreen or orientation lock failed, fall through
      }

      // Strategy 2: CSS rotation fallback for browsers that don't support orientation lock
      shell.classList.add("is-rotated");
      document.body.classList.add("body-player-rotated");
    }
  };

  // Clean up rotated state when exiting fullscreen
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isRotated) {
      isRotated = false;
      shell?.classList.remove("is-rotated");
      document.body.classList.remove("body-player-rotated");
      try {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        orientation.unlock?.();
      } catch { /* ignore */ }
    }

    // Sync fullscreen icons
    document.querySelectorAll("[data-icon-full]").forEach((el) => {
      (el as HTMLElement).style.display = document.fullscreenElement ? "none" : "";
    });
    document.querySelectorAll("[data-icon-exit]").forEach((el) => {
      (el as HTMLElement).style.display = document.fullscreenElement ? "" : "none";
    });
  });

  // ── Event bindings ──
  playButtons.forEach((button) => button.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlay();
  }));
  rotateButtons.forEach((button) => button.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleRotate();
  }));
  fullscreenButtons.forEach((button) => button.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFullscreen();
  }));

  seek?.addEventListener("input", () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration || !seek.value) return;
    video.currentTime = (Number(seek.value) / 100) * duration;
  });
  volume?.addEventListener("input", () => {
    video.volume = Number(volume.value);
    video.muted = video.volume === 0;
  });
  speed?.addEventListener("change", () => {
    video.playbackRate = Number(speed.value) || 1;
  });

  // ── Touch handling for mobile ──
  // Single tap on video = toggle controls, double tap = seek ±10s
  let tapTimeout: number | undefined;
  let lastTapTime = 0;
  let lastTapX = 0;

  video.addEventListener("click", (e) => {
    // On desktop, simple click = toggle play
    if (!("ontouchstart" in window)) {
      togglePlay();
      return;
    }

    // On mobile, handle via the touchend logic below
    e.preventDefault();
  });

  video.addEventListener("touchend", (e) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch) return;

    const timeDiff = now - lastTapTime;
    const x = touch.clientX;

    if (timeDiff < 300 && Math.abs(x - lastTapX) < 50) {
      // Double tap detected
      if (tapTimeout) window.clearTimeout(tapTimeout);
      const rect = video.getBoundingClientRect();
      const half = rect.left + rect.width / 2;
      if (x < half) {
        // Double tap left = seek back
        if (Number.isFinite(video.duration)) {
          video.currentTime = Math.max(0, video.currentTime - 10);
        }
      } else {
        // Double tap right = seek forward
        if (Number.isFinite(video.duration)) {
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
        }
      }
      showControls();
      lastTapTime = 0;
    } else {
      // Single tap – wait to see if it becomes a double
      lastTapTime = now;
      lastTapX = x;
      if (tapTimeout) window.clearTimeout(tapTimeout);
      tapTimeout = window.setTimeout(() => {
        // Confirmed single tap: toggle controls visibility
        if (controlsVisible && !video.paused) {
          setControlsVisible(false);
          if (hideTimer) window.clearTimeout(hideTimer);
        } else {
          showControls();
        }
      }, 300);
    }
  });

  // Desktop: mouse movement shows controls
  shell?.addEventListener("mousemove", () => showControls());
  shell?.addEventListener("mouseleave", () => {
    if (!video.paused) {
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setControlsVisible(false), 800);
    }
  });

  // Hovering over the controls bar keeps them visible
  controlsBar?.addEventListener("pointerenter", () => {
    if (hideTimer) window.clearTimeout(hideTimer);
  });
  controlsBar?.addEventListener("pointerleave", () => {
    if (!video.paused) scheduleHide();
  });

  // Prevent controls bar clicks/touches from propagating to video
  controlsBar?.addEventListener("click", (e) => e.stopPropagation());
  controlsBar?.addEventListener("touchend", (e) => e.stopPropagation());

  video.addEventListener("play", syncPlay);
  video.addEventListener("pause", syncPlay);
  video.addEventListener("ended", () => showControls(true));
  video.addEventListener("loadedmetadata", syncTime);
  video.addEventListener("timeupdate", syncTime);

  syncPlay();
  syncTime();
}

function setupPlaybackShortcuts(video: HTMLVideoElement, subtitleApi: { toggle: () => void }) {
  const previousUrl = video.dataset.previousUrl || "";
  const nextUrl = video.dataset.nextUrl || "";
  const goTo = (url: string) => {
    if (url) window.location.href = url;
  };
  const seek = (seconds: number) => {
    if (!Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  document.querySelectorAll('[data-player-action="seek-back"]').forEach((button) => button.addEventListener("click", () => seek(-10)));
  document.querySelectorAll('[data-player-action="seek-forward"]').forEach((button) => button.addEventListener("click", () => seek(10)));
  document.querySelectorAll('[data-player-action="subtitle"]').forEach((button) => button.addEventListener("click", () => subtitleApi.toggle()));
  document.querySelectorAll('[data-player-action="previous"]').forEach((button) => button.addEventListener("click", () => goTo(previousUrl)));
  document.querySelectorAll('[data-player-action="next"]').forEach((button) => button.addEventListener("click", () => goTo(nextUrl)));

  document.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("input, select, textarea, button")) return;

    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      event.preventDefault();
      if (video.paused) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    } else if (key === "arrowleft" || key === "j") {
      event.preventDefault();
      seek(-10);
    } else if (key === "arrowright" || key === "l") {
      event.preventDefault();
      seek(10);
    } else if (key === "s") {
      event.preventDefault();
      subtitleApi.toggle();
    } else if (key === "n") {
      event.preventDefault();
      goTo(nextUrl);
    } else if (key === "p") {
      event.preventDefault();
      goTo(previousUrl);
    } else if (key === "f") {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>('[data-player-action="fullscreen"]')?.click();
    }
  });
}

function setupMediaSession(video: HTMLVideoElement) {
  if (!("mediaSession" in navigator)) return;

  const previousUrl = video.dataset.previousUrl || "";
  const nextUrl = video.dataset.nextUrl || "";
  const seek = (seconds: number) => {
    if (!Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  navigator.mediaSession.setActionHandler("seekbackward", () => seek(-10));
  navigator.mediaSession.setActionHandler("seekforward", () => seek(10));
  navigator.mediaSession.setActionHandler("previoustrack", previousUrl ? () => (window.location.href = previousUrl) : null);
  navigator.mediaSession.setActionHandler("nexttrack", nextUrl ? () => (window.location.href = nextUrl) : null);
}

function setupAutoNext(video: HTMLVideoElement) {
  const nextUrl = video.dataset.nextUrl || "";
  const toggle = document.querySelector<HTMLButtonElement>('[data-player-action="autonext"]');
  const cancel = document.querySelector<HTMLButtonElement>('[data-player-action="cancel-autonext"]');
  const countdown = document.querySelector<HTMLElement>("[data-autonext-countdown]");
  const secondsLabel = document.querySelector<HTMLElement>("[data-autonext-seconds]");
  const storageKey = "pgdrama:autoNext";
  let enabled = localStorage.getItem(storageKey) !== "off";
  let timer: number | undefined;
  let secondsLeft = 5;

  const syncToggle = () => {
    if (!toggle) return;
    toggle.classList.toggle("is-primary", enabled);
  };

  const clearCountdown = () => {
    if (timer) window.clearInterval(timer);
    timer = undefined;
    countdown?.classList.add("hidden");
  };

  const goNext = () => {
    if (nextUrl) window.location.href = nextUrl;
  };

  const startCountdown = () => {
    if (!nextUrl || !enabled) return;
    secondsLeft = 5;
    if (secondsLabel) secondsLabel.textContent = String(secondsLeft);
    countdown?.classList.remove("hidden");

    timer = window.setInterval(() => {
      secondsLeft -= 1;
      if (secondsLabel) secondsLabel.textContent = String(Math.max(secondsLeft, 0));
      if (secondsLeft <= 0) {
        clearCountdown();
        goNext();
      }
    }, 1000);
  };

  if (!nextUrl) {
    toggle?.setAttribute("disabled", "true");
    return;
  }

  syncToggle();
  toggle?.addEventListener("click", () => {
    enabled = !enabled;
    localStorage.setItem(storageKey, enabled ? "on" : "off");
    if (!enabled) clearCountdown();
    syncToggle();
  });
  cancel?.addEventListener("click", () => {
    enabled = false;
    localStorage.setItem(storageKey, "off");
    clearCountdown();
    syncToggle();
  });
  video.addEventListener("play", clearCountdown);
  video.addEventListener("ended", startCountdown);
}

function toVtt(subtitle: string) {
  const normalized = subtitle.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.startsWith("WEBVTT")) return normalized;
  return `WEBVTT\n\n${normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rest = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
