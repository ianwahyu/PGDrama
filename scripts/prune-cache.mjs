import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const dbPath = resolve(process.env.CACHE_DB_PATH ?? ".cache/splay-cache.db");
const dir = dirname(dbPath);

if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS cache_entries (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
const now = Math.floor(Date.now() / 1000);
const deleted = db.prepare("DELETE FROM cache_entries WHERE expires_at <= ?").run(now).changes;

console.log(`Pruned ${deleted} expired cache entries.`);
