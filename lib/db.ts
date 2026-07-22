import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  // Don't throw at import time (would break the build) — routes that touch
  // the DB will fail loudly at request time instead, which is easier to debug.
  console.warn(
    "[db] No POSTGRES_URL / DATABASE_URL set. Set one in your environment before using the app."
  );
}

const globalForPool = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPool.pgPool ??
  new Pool({
    connectionString,
    ssl: connectionString?.includes("sslmode=require") || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent — safe to call at the top of every route. Only actually runs once per warm instance. */
export function ensureSchema(): Promise<void> {
  if (!connectionString) {
    return Promise.reject(
      new Error(
        "No database configured. Set POSTGRES_URL (or DATABASE_URL) in your environment and restart the server."
      )
    );
  }
  if (!schemaReady) {
    schemaReady = pool
      .query(`
      CREATE TABLE IF NOT EXISTS game_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        current_gw INTEGER NOT NULL DEFAULT 1,
        phase TEXT NOT NULL DEFAULT 'picking',
        season TEXT NOT NULL DEFAULT '2026-27',
        api_season TEXT NOT NULL DEFAULT '2026',
        CONSTRAINT single_row CHECK (id = 1)
      );
      INSERT INTO game_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'alive',
        eliminated_gw INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS picks (
        id SERIAL PRIMARY KEY,
        gw INTEGER NOT NULL,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        forward TEXT NOT NULL,
        midfielder TEXT NOT NULL,
        defender TEXT NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (gw, participant_id)
      );

      CREATE TABLE IF NOT EXISTS results (
        gw INTEGER PRIMARY KEY,
        scorers JSONB NOT NULL DEFAULT '[]',
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS fixtures (
        id SERIAL PRIMARY KEY,
        season TEXT NOT NULL,
        gw INTEGER NOT NULL,
        home TEXT NOT NULL,
        away TEXT NOT NULL,
        kickoff TIMESTAMPTZ,
        venue TEXT,
        status TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        UNIQUE (season, gw, home, away)
      );

      CREATE TABLE IF NOT EXISTS sync_meta (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_synced_at TIMESTAMPTZ,
        last_error TEXT,
        CONSTRAINT single_row CHECK (id = 1)
      );
      INSERT INTO sync_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    `)
      .then(() => undefined)
      .catch((err) => {
        // Don't leave a permanently-rejected promise cached — let the next
        // request try again (handy after fixing a bad connection string).
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}
