export type ContentType = "dramas" | "anime" | "moviebox" | "iqiyi" | "wetv" | "drakor";
export type BacaCategory = "manga" | "manhwa" | "manhua";

export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type NormalizedItem = {
  id: string;
  type: string;
  title: string;
  cover_url?: string | null;
  provider?: string | null;
  description?: string | null;
  episode_count?: number | null;
  language?: string | null;
  raw: Record<string, unknown>;
};

export type NormalizedList = {
  items: NormalizedItem[];
  meta: PaginationMeta;
  error?: AppError;
};

export type AppError = {
  status: number;
  code: string;
  message: string;
  retryAfter?: string | null;
};

export type EpisodeItem = {
  id: string;
  index: number;
  title: string;
  video_url?: string | null;
  subtitle_url?: string | null;
  subtitles?: SubtitleTrack[];
  qualities?: Record<string, string> | null;
  raw: Record<string, unknown>;
};

export type SubtitleTrack = {
  label: string;
  url: string;
  language?: string;
};
