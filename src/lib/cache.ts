import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { getEnv } from "./env";

type CacheRow = {
  value_json: string;
  expires_at: number;
};

let db: DatabaseSync | undefined;

function getDb() {
  if (db) return db;

  const env = getEnv();
  const dbPath = resolve(env.CACHE_DB_PATH);
  const dir = dirname(dbPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at
      ON cache_entries(expires_at);
  `);

  return db;
}

const revalidating = new Set<string>();

export async function getCachedOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const database = getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = database
    .prepare("SELECT value_json, expires_at FROM cache_entries WHERE key = ?")
    .get(key) as CacheRow | undefined;

  // Cache HIT (fresh) → return immediately
  if (row && row.expires_at > now) {
    return JSON.parse(row.value_json) as T;
  }

  // Cache STALE (ada data lama, tapi sudah expired) → sajikan dulu, refresh di background
  if (row && !revalidating.has(key)) {
    revalidating.add(key);
    // Refresh cache di background tanpa memblokir user
    Promise.resolve()
      .then(() => fetcher())
      .then((value) => {
        try {
          database
            .prepare(
              `INSERT INTO cache_entries (key, value_json, expires_at, created_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET
                 value_json = excluded.value_json,
                 expires_at = excluded.expires_at`
            )
            .run(key, JSON.stringify(value), now + ttlSeconds, now);
        } finally {
          revalidating.delete(key);
        }
      })
      .catch(() => revalidating.delete(key));

    // Sajikan data stale langsung ke user (tidak nunggu)
    return JSON.parse(row.value_json) as T;
  }

  // Cache MISS (tidak ada data sama sekali) → fetch dan tunggu
  const value = await fetcher();
  database
    .prepare(
      `INSERT INTO cache_entries (key, value_json, expires_at, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         expires_at = excluded.expires_at`
    )
    .run(key, JSON.stringify(value), now + ttlSeconds, now);

  return value;
}

export function pruneExpiredCache() {
  const now = Math.floor(Date.now() / 1000);
  return getDb().prepare("DELETE FROM cache_entries WHERE expires_at <= ?").run(now).changes;
}

export function cacheKey(path: string, params: URLSearchParams | Record<string, string | number | undefined>) {
  const search =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([key, value]) => [key, String(value)])
        );

  search.sort();
  return `${path}?${search.toString()}`;
}
