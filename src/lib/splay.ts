import { getCachedOrFetch, cacheKey } from "./cache";
import { getEnv } from "./env";
import type { AppError, BacaCategory, ContentType, EpisodeItem, NormalizedItem, NormalizedList } from "./types";

const DEFAULT_META = { page: 1, per_page: 20, total: 0, total_pages: 0 };
const EPISODE_TTL_SECONDS = 60;

type QueryValue = string | number | undefined | null;

export function toQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  return search;
}

function endpointFor(type: ContentType) {
  return `/api/${type}`;
}

function titleOf(raw: Record<string, unknown>) {
  return String(raw.title ?? raw.name ?? raw.episode_name ?? raw.id ?? "Untitled");
}

function coverOf(raw: Record<string, unknown>) {
  return (raw.cover_url ?? raw.poster_url ?? raw.image_url ?? raw.thumbnail_url ?? null) as string | null;
}

export function normalizeItem(raw: Record<string, unknown>, type: string): NormalizedItem {
  return {
    id: String(raw.id),
    type,
    title: titleOf(raw),
    cover_url: coverOf(raw),
    provider: (raw.provider_name ?? raw.provider_slug ?? raw.provider ?? null) as string | null,
    description: (raw.introduction ?? raw.description ?? raw.overview ?? null) as string | null,
    episode_count: (raw.chapter_count ?? raw.available_episodes ?? raw.episode_count ?? null) as number | null,
    language: (raw.language ?? raw.origin ?? null) as string | null,
    raw
  };
}

function normalizeEpisode(raw: Record<string, unknown>, fallbackIndex: number): EpisodeItem {
  const index = Number(raw.episode_index ?? raw.number ?? raw.chapter_index ?? fallbackIndex);
  return {
    id: String(raw.id ?? raw.episode_id ?? index),
    index,
    title: String(raw.episode_name ?? raw.name ?? raw.title ?? `Episode ${index}`),
    video_url: (raw.video_url ?? raw.url ?? raw.hls_url ?? null) as string | null,
    subtitle_url: (raw.subtitle_url ?? null) as string | null,
    qualities: (raw.qualities ?? null) as Record<string, string> | null,
    raw
  };
}

function appError(status: number, code = "RequestFailed", retryAfter?: string | null): AppError {
  const messages: Record<number, string> = {
    401: "API key SPlay tidak valid atau belum dipasang.",
    402: "Plan SPlay perlu di-upgrade untuk konten ini.",
    403: "Konten ini belum tersedia di plan API kamu.",
    404: "Konten tidak ditemukan.",
    429: "Rate limit SPlay tercapai. Coba lagi sebentar lagi.",
    503: "Tipe konten ini sedang tidak aktif dari SPlay."
  };

  return {
    status,
    code,
    message: messages[status] ?? "SPlay sedang tidak bisa dihubungi.",
    retryAfter
  };
}

async function requestJson<T>(path: string, params = new URLSearchParams(), retry = true): Promise<T> {
  const env = getEnv();
  const url = new URL(path, env.SPLAY_BASE_URL);
  params.forEach((value, key) => url.searchParams.set(key, value));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SPLAY_API_KEY}`,
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw appError(response.status, response.statusText, response.headers.get("Retry-After"));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (retry && !(typeof error === "object" && error && "status" in error)) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return requestJson<T>(path, params, false);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeListPayload(payload: any, type: string): NormalizedList {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return {
    items: data.map((item: Record<string, unknown>) => normalizeItem(item, type)),
    meta: payload?.meta ?? DEFAULT_META
  };
}

export async function listContent(type: ContentType, params: URLSearchParams): Promise<NormalizedList> {
  const path = endpointFor(type);
  return getCachedOrFetch(cacheKey(path, params), getEnv().CACHE_TTL_SECONDS, async () => {
    try {
      return normalizeListPayload(await requestJson(path, params), type);
    } catch (error) {
      return { items: [], meta: DEFAULT_META, error: error as AppError };
    }
  });
}

export async function listBaca(category: BacaCategory, params: URLSearchParams): Promise<NormalizedList> {
  const path = `/api/baca/${category}`;
  return getCachedOrFetch(cacheKey(path, params), getEnv().CACHE_TTL_SECONDS, async () => {
    try {
      return normalizeListPayload(await requestJson(path, params), `baca-${category}`);
    } catch (error) {
      return { items: [], meta: DEFAULT_META, error: error as AppError };
    }
  });
}

export async function getPopularDramas() {
  const params = toQuery({ per_page: 12 });
  return getCachedOrFetch(cacheKey("/api/dramas/popular", params), getEnv().CACHE_TTL_SECONDS, async () =>
    normalizeListPayload(await requestJson("/api/dramas/popular", params), "dramas")
  );
}

export async function getTrendingDramas() {
  const params = toQuery({ per_page: 12 });
  return getCachedOrFetch(cacheKey("/api/dramas/trending", params), getEnv().CACHE_TTL_SECONDS, async () =>
    normalizeListPayload(await requestJson("/api/dramas/trending", params), "dramas")
  );
}

export async function searchContent(q: string, perPage = 24): Promise<NormalizedList> {
  const params = toQuery({ q, per_page: perPage });
  return getCachedOrFetch(cacheKey("/api/search", params), getEnv().CACHE_TTL_SECONDS, async () => {
    try {
      return normalizeListPayload(await requestJson("/api/search", params), "dramas");
    } catch (error) {
      return { items: [], meta: DEFAULT_META, error: error as AppError };
    }
  });
}

export async function getDetail(type: ContentType, id: string) {
  const path = `${endpointFor(type)}/${id}`;
  return getCachedOrFetch(path, getEnv().CACHE_TTL_SECONDS, async () => {
    const payload: any = await requestJson(path);
    const raw = payload?.data?.drama ?? payload?.data?.item ?? payload?.data ?? {};
    return {
      item: normalizeItem(raw, type),
      tags: payload?.data?.tags ?? raw?.tags ?? []
    };
  });
}

export async function getBacaDetail(category: BacaCategory, id: string) {
  const path = `/api/baca/${category}/${id}`;
  return getCachedOrFetch(path, getEnv().CACHE_TTL_SECONDS, async () => {
    const payload: any = await requestJson(path);
    const raw = payload?.data?.item ?? payload?.data ?? {};
    return {
      item: normalizeItem(raw, `baca-${category}`),
      tags: payload?.data?.tags ?? raw?.tags ?? []
    };
  });
}

export async function getEpisodes(type: ContentType, id: string): Promise<EpisodeItem[]> {
  const path = type === "anime" ? `/api/anime/${id}/episodes` : `${endpointFor(type)}/${id}/episodes`;
  const payload: any = await getCachedOrFetch(path, EPISODE_TTL_SECONDS, () => requestJson(path, toQuery({ per_page: 100 })));
  const data = Array.isArray(payload?.data) ? payload.data : payload?.data?.episodes ?? [];
  return data.map((item: Record<string, unknown>, index: number) => normalizeEpisode(item, index + 1));
}

export async function getEpisode(type: ContentType, id: string, episode: string): Promise<EpisodeItem | null> {
  if (type === "anime") {
    const payload: any = await requestJson(`/api/anime/${id}/episodes/${episode}`);
    const raw = payload?.data ?? {};
    return normalizeEpisode(raw, Number(episode));
  }

  const episodes = await getEpisodes(type, id);
  return episodes.find((item) => item.id === episode || String(item.index) === episode) ?? null;
}

export async function getBacaChapters(category: BacaCategory, id: string): Promise<EpisodeItem[]> {
  const path = `/api/baca/${category}/${id}/chapters`;
  const payload: any = await getCachedOrFetch(path, EPISODE_TTL_SECONDS, () => requestJson(path, toQuery({ per_page: 100 })));
  const data = Array.isArray(payload?.data) ? payload.data : payload?.data?.chapters ?? [];
  return data.map((item: Record<string, unknown>, index: number) => normalizeEpisode(item, index + 1));
}
