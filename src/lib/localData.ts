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
