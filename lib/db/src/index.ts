import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema/index.js";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the PostgreSQL database connection.");
}

function isLocalDatabase(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function createPoolConfig(): PoolConfig {
  const sslDisabled =
    process.env.PGSSLMODE === "disable" || databaseUrl.includes("sslmode=disable");
  const baseConfig: PoolConfig = {
    connectionString: databaseUrl,
    max: Number(process.env.PG_POOL_MAX ?? 10),
  };

  if (sslDisabled || isLocalDatabase(databaseUrl)) {
    return { ...baseConfig, ssl: false };
  }

  if (databaseUrl.includes("sslmode=")) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ssl: { rejectUnauthorized: false },
  };
}

const pool = new Pool(createPoolConfig());

export const db = drizzle(pool, { schema });

export { and, desc, eq, isNull } from "drizzle-orm";

let databaseReady: Promise<void> | null = null;

export function ensureDatabase() {
  databaseReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nom TEXT,
      prenom TEXT,
      pseudo TEXT,
      age TEXT,
      ai_style TEXT,
      workspace_base TEXT,
      workspace_accent TEXT,
      workspace_glow TEXT,
      workspace_motion TEXT,
      created_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint),
      updated_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      "order" INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint)
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      parent_folder_id TEXT,
      "order" INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint)
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      file_url TEXT,
      mime_type TEXT,
      file_size INTEGER,
      url TEXT,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      width REAL DEFAULT 400,
      height REAL DEFAULT 300,
      ai_summary TEXT,
      tags TEXT,
      created_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint),
      updated_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint)
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint),
      file_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
      summary TEXT,
      topic TEXT,
      message_count INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint),
      updated_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint),
      archived_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens INTEGER DEFAULT 0,
      metadata TEXT,
      created_at BIGINT NOT NULL DEFAULT (floor(extract(epoch from now()) * 1000)::bigint)
    );

    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv ON conversation_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_messages_user ON conversation_messages(user_id);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_base TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_accent TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_glow TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_motion TEXT;
  `).then(() => undefined);

  return databaseReady;
}

export async function closeDatabase() {
  await pool.end();
}

export * from "./schema/index.js";
