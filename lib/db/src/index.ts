import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const { Pool } = pg;

let _db: any = null;
let _pool: pg.Pool | null = null;
let _pglite: PGlite | null = null;

const INIT_DDL = `
CREATE TABLE IF NOT EXISTS decisions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT,
  item TEXT,
  material TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  location TEXT,
  use_case TEXT,
  current_option TEXT,
  file_name TEXT,
  object_path TEXT,
  content_type TEXT,
  source_text TEXT NOT NULL DEFAULT '',
  parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  firewall_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'intake',
  review_notes TEXT,
  reviewer TEXT,
  approved_at TIMESTAMPTZ,
  selected_alternative TEXT,
  owner_id TEXT DEFAULT 'default-user',
  share_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  decision_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function initDb(): Promise<void> {
  if (process.env.DATABASE_URL) {
    if (!_pool) {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzlePg(_pool, { schema });
    }
    await _pool.query(INIT_DDL);
  } else {
    if (!_pglite) {
      const dataDir = path.resolve(process.cwd(), ".data", "pgdata");
      fs.mkdirSync(dataDir, { recursive: true });
      _pglite = new PGlite(dataDir);
      _db = drizzlePglite(_pglite, { schema });
    }
    await _pglite.exec(INIT_DDL);
  }
}

if (process.env.DATABASE_URL) {
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzlePg(_pool, { schema });
} else {
  const dataDir = path.resolve(process.cwd(), ".data", "pgdata");
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    _pglite = new PGlite(dataDir);
    _db = drizzlePglite(_pglite, { schema });
  } catch {
    _pglite = new PGlite();
    _db = drizzlePglite(_pglite, { schema });
  }
}

export const pool = _pool;
export const pgliteInstance = _pglite;
export const db = _db;

export { eq, desc, and, sql, asc } from "drizzle-orm";
export * from "./schema";


