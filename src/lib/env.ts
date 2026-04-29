export type AppEnv = {
  SPLAY_API_KEY: string;
  SPLAY_BASE_URL: string;
  CACHE_DB_PATH: string;
  CACHE_TTL_SECONDS: number;
};

const DEFAULTS = {
  SPLAY_BASE_URL: "https://api.splay.id",
  CACHE_DB_PATH: ".cache/splay-cache.db",
  CACHE_TTL_SECONDS: 600
};

export function getEnv(): AppEnv {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  const apiKey = process.env.SPLAY_API_KEY ?? viteEnv.SPLAY_API_KEY;

  if (!apiKey) {
    throw new Error("Missing SPLAY_API_KEY. Copy .env.example to .env.local and set your API key.");
  }

  return {
    SPLAY_API_KEY: apiKey,
    SPLAY_BASE_URL: process.env.SPLAY_BASE_URL ?? viteEnv.SPLAY_BASE_URL ?? DEFAULTS.SPLAY_BASE_URL,
    CACHE_DB_PATH: process.env.CACHE_DB_PATH ?? viteEnv.CACHE_DB_PATH ?? DEFAULTS.CACHE_DB_PATH,
    CACHE_TTL_SECONDS: Number(process.env.CACHE_TTL_SECONDS ?? viteEnv.CACHE_TTL_SECONDS ?? DEFAULTS.CACHE_TTL_SECONDS)
  };
}
