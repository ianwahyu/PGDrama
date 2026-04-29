export type FavoriteEntry = {
  id: string;
  type: string;
  title: string;
  cover_url?: string | null;
  provider?: string | null;
  saved_at: string;
};

export type HistoryEntry = {
  id: string;
  type: string;
  episode_id: string;
  episode_index: number;
  title: string;
  cover_url?: string | null;
  progress_seconds: number;
  duration_seconds: number;
  watched_at: string;
};

export type GroupedHistoryEntry = {
  id: string;
  type: string;
  title: string;
  cover_url?: string | null;
  latest: HistoryEntry;
  episodeIndexes: number[];
  count: number;
  href: string;
  detailHref: string;
  progressPercent: number;
};

const FAVORITES_KEY = "pgdrama:favorites";
const HISTORY_KEY = "pgdrama:watchHistory";

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or full storage should not break the UI.
  }
}

export function getFavorites() {
  return safeRead<FavoriteEntry[]>(FAVORITES_KEY, []);
}

export function isFavorite(id: string, type: string) {
  return getFavorites().some((item) => item.id === String(id) && item.type === type);
}

export function toggleFavorite(item: Omit<FavoriteEntry, "saved_at">) {
  const favorites = getFavorites();
  const exists = favorites.some((entry) => entry.id === String(item.id) && entry.type === item.type);
  const next = exists
    ? favorites.filter((entry) => !(entry.id === String(item.id) && entry.type === item.type))
    : [{ ...item, id: String(item.id), saved_at: new Date().toISOString() }, ...favorites].slice(0, 200);
  safeWrite(FAVORITES_KEY, next);
  return next;
}

export function removeFavorite(id: string, type: string) {
  const next = getFavorites().filter((entry) => !(entry.id === String(id) && entry.type === type));
  safeWrite(FAVORITES_KEY, next);
}

export function getHistory() {
  return safeRead<HistoryEntry[]>(HISTORY_KEY, []);
}

export function saveHistory(entry: HistoryEntry) {
  const withoutCurrent = getHistory().filter(
    (item) => !(item.id === entry.id && item.type === entry.type && item.episode_id === entry.episode_id)
  );
  safeWrite(HISTORY_KEY, [{ ...entry, watched_at: new Date().toISOString() }, ...withoutCurrent].slice(0, 300));
}

export function getLatestHistoryFor(id: string, type: string) {
  return getHistory().find((item) => item.id === String(id) && item.type === type);
}

export function clearHistory() {
  safeWrite(HISTORY_KEY, []);
}

export function getGroupedHistory(): GroupedHistoryEntry[] {
  const groups = new Map<string, { latest: HistoryEntry; episodeIndexes: Set<number> }>();

  for (const item of getHistory()) {
    const key = `${item.type}:${item.id}`;
    const existing = groups.get(key);
    const watchedAt = Date.parse(item.watched_at) || 0;
    const existingWatchedAt = existing ? Date.parse(existing.latest.watched_at) || 0 : 0;

    if (!existing) {
      groups.set(key, { latest: item, episodeIndexes: new Set([item.episode_index]) });
      continue;
    }

    existing.episodeIndexes.add(item.episode_index);
    if (watchedAt > existingWatchedAt) {
      existing.latest = item;
    }
  }

  return Array.from(groups.values())
    .map(({ latest, episodeIndexes }) => {
      const progressPercent = latest.duration_seconds
        ? Math.min(100, Math.round((latest.progress_seconds / latest.duration_seconds) * 100))
        : 0;

      return {
        id: latest.id,
        type: latest.type,
        title: latest.title,
        cover_url: latest.cover_url,
        latest,
        episodeIndexes: Array.from(episodeIndexes).sort((a, b) => a - b),
        count: episodeIndexes.size,
        href: `/${latest.type}/${latest.id}/watch/${latest.episode_index}`,
        detailHref: detailHrefFor(latest.type, latest.id),
        progressPercent
      };
    })
    .sort((a, b) => (Date.parse(b.latest.watched_at) || 0) - (Date.parse(a.latest.watched_at) || 0));
}

export function getRecentContent(limit = 8) {
  return getGroupedHistory().slice(0, limit);
}

export function getContinueWatching(limit = 4) {
  const grouped = getGroupedHistory();
  const inProgress = grouped.filter((item) => item.latest.duration_seconds === 0 || item.progressPercent < 95);
  return (inProgress.length ? inProgress : grouped).slice(0, limit);
}

export function getLocalRecommendationHints() {
  const typeCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  const contentKeys = new Set<string>();

  for (const item of getGroupedHistory()) {
    contentKeys.add(`${item.type}:${item.id}`);
    typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
  }

  for (const item of getFavorites()) {
    contentKeys.add(`${item.type}:${item.id}`);
    typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
    if (item.provider) {
      providerCounts.set(item.provider, (providerCounts.get(item.provider) ?? 0) + 1);
    }
  }

  return {
    types: sortCounts(typeCounts),
    providers: sortCounts(providerCounts),
    contentKeys: Array.from(contentKeys)
  };
}

function detailHrefFor(type: string, id: string) {
  if (type.startsWith("baca-")) {
    return `/baca/${type.replace("baca-", "")}/${id}`;
  }
  return `/${type}/${id}`;
}

function sortCounts(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}
