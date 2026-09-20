import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const { Pool } = pg;

let _db: any = null;
let _pool: pg.Pool | null = null;

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

// Zero-WASM, ultra-lightweight file-backed storage engine (<1MB RAM)
class JsonStore {
  private dataDir: string;
  private decisionsFile: string;
  private auditFile: string;
  private decisions: Map<number, any> = new Map();
  private auditLogs: Map<number, any> = new Map();
  private nextDecisionId = 1;
  private nextAuditId = 1;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), ".data");
    this.decisionsFile = path.join(this.dataDir, "db_decisions.json");
    this.auditFile = path.join(this.dataDir, "db_audit_logs.json");
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.decisionsFile)) {
        const raw = fs.readFileSync(this.decisionsFile, "utf-8");
        const list = JSON.parse(raw);
        for (const item of list) {
          const row = {
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
          };
          this.decisions.set(row.id, row);
          if (row.id >= this.nextDecisionId) {
            this.nextDecisionId = row.id + 1;
          }
        }
      }
      if (fs.existsSync(this.auditFile)) {
        const raw = fs.readFileSync(this.auditFile, "utf-8");
        const list = JSON.parse(raw);
        for (const item of list) {
          const row = {
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          };
          this.auditLogs.set(row.id, row);
          if (row.id >= this.nextAuditId) {
            this.nextAuditId = row.id + 1;
          }
        }
      }
    } catch {}
  }

  private save() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const decList = Array.from(this.decisions.values());
      const audList = Array.from(this.auditLogs.values());
      fs.writeFileSync(this.decisionsFile, JSON.stringify(decList, null, 2), "utf-8");
      fs.writeFileSync(this.auditFile, JSON.stringify(audList, null, 2), "utf-8");
    } catch {}
  }

  insert(table: any) {
    const isDecisions = table === schema.decisionsTable || (table && table._ && table._.name === "decisions");
    const self = this;

    return {
      values(row: any) {
        const now = new Date();
        let createdRecord: any;

        if (isDecisions) {
          const id = self.nextDecisionId++;
          createdRecord = {
            id,
            title: row.title || "Untitled Decision",
            organization: row.organization || null,
            item: row.item || null,
            material: row.material || null,
            quantity: row.quantity ?? 1,
            price: row.price ?? null,
            currency: row.currency || "USD",
            location: row.location || null,
            useCase: row.useCase || null,
            currentOption: row.currentOption || null,
            fileName: row.fileName || null,
            objectPath: row.objectPath || null,
            contentType: row.contentType || null,
            sourceText: row.sourceText || "",
            parsedData: row.parsedData || {},
            analysis: row.analysis || {},
            assumptions: row.assumptions || {},
            impact: row.impact || {},
            alternatives: row.alternatives || [],
            evidence: row.evidence || [],
            missingData: row.missingData || [],
            firewallFlags: row.firewallFlags || [],
            status: row.status || "intake",
            reviewNotes: row.reviewNotes || null,
            reviewer: row.reviewer || null,
            approvedAt: row.approvedAt || null,
            selectedAlternative: row.selectedAlternative || null,
            ownerId: row.ownerId || "default-user",
            shareId: row.shareId || null,
            createdAt: now,
            updatedAt: now,
          };
          self.decisions.set(id, createdRecord);
        } else {
          const id = self.nextAuditId++;
          createdRecord = {
            id,
            decisionId: row.decisionId,
            eventType: row.eventType,
            actor: row.actor || "system",
            metadata: row.metadata || {},
            createdAt: now,
          };
          self.auditLogs.set(id, createdRecord);
        }

        self.save();

        return {
          returning() {
            return Promise.resolve([createdRecord]);
          },
          then(resolve: any, reject: any) {
            return Promise.resolve([createdRecord]).then(resolve, reject);
          },
        };
      },
    };
  }

  select() {
    const self = this;
    return {
      from(table: any) {
        const isDecisions = table === schema.decisionsTable || (table && table._ && table._.name === "decisions");
        const map = isDecisions ? self.decisions : self.auditLogs;
        let rows = Array.from(map.values()).map((r) => ({ ...r }));

        const queryObj = {
          where(filterFn: any) {
            if (typeof filterFn === "function") {
              rows = rows.filter(filterFn);
            }
            return {
              orderBy(sortFn: any) {
                if (typeof sortFn === "function") {
                  rows.sort(sortFn);
                }
                return Promise.resolve(rows);
              },
              then(resolve: any, reject: any) {
                return Promise.resolve(rows).then(resolve, reject);
              },
            };
          },
          orderBy(sortFn: any) {
            if (typeof sortFn === "function") {
              rows.sort(sortFn);
            }
            return Promise.resolve(rows);
          },
          then(resolve: any, reject: any) {
            return Promise.resolve(rows).then(resolve, reject);
          },
        };

        return queryObj;
      },
    };
  }

  update(table: any) {
    const isDecisions = table === schema.decisionsTable || (table && table._ && table._.name === "decisions");
    const self = this;

    return {
      set(updates: any) {
        return {
          where(filterFn: any) {
            return {
              returning() {
                const map = isDecisions ? self.decisions : self.auditLogs;
                const updatedList: any[] = [];
                for (const [id, row] of map.entries()) {
                  if (typeof filterFn === "function" && filterFn(row)) {
                    const updated = {
                      ...row,
                      ...updates,
                      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : new Date(),
                      approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : row.approvedAt,
                    };
                    map.set(id, updated);
                    updatedList.push({ ...updated });
                  }
                }
                self.save();
                return Promise.resolve(updatedList);
              },
              then(resolve: any, reject: any) {
                return this.returning().then(resolve, reject);
              },
            };
          },
        };
      },
    };
  }
}

let _jsonStore: JsonStore | null = null;

export async function initDb(): Promise<void> {
  if (process.env.DATABASE_URL) {
    if (!_pool) {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzlePg(_pool, { schema });
    }
    await _pool.query(INIT_DDL);
  } else {
    if (!_jsonStore) {
      _jsonStore = new JsonStore();
      _db = _jsonStore;
    }
  }
}

if (process.env.DATABASE_URL) {
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzlePg(_pool, { schema });
} else {
  _jsonStore = new JsonStore();
  _db = _jsonStore;
}

export const pool = _pool;
export const pgliteInstance = null;
export const db = _db;

// Helper predicate functions compatible with Drizzle and JsonStore
export function eq(column: any, value: any) {
  if (process.env.DATABASE_URL) {
    const { eq: drizzleEq } = require("drizzle-orm");
    return drizzleEq(column, value);
  }
  const colName = column?.name || column?.key || column;
  return (record: any) => {
    return (
      record[colName] === value ||
      record[toCamelCase(colName)] === value ||
      (colName === "decision_id" && record.decisionId === value) ||
      (colName === "id" && record.id === value)
    );
  };
}

export function desc(column: any) {
  if (process.env.DATABASE_URL) {
    const { desc: drizzleDesc } = require("drizzle-orm");
    return drizzleDesc(column);
  }
  const colName = column?.name || column?.key || column;
  return (a: any, b: any) => {
    const valA = a[colName] ?? a[toCamelCase(colName)] ?? a.createdAt ?? a.id;
    const valB = b[colName] ?? b[toCamelCase(colName)] ?? b.createdAt ?? b.id;
    if (valA instanceof Date && valB instanceof Date) {
      return valB.getTime() - valA.getTime();
    }
    if (typeof valB === "number" && typeof valA === "number") {
      return valB - valA;
    }
    return String(valB).localeCompare(String(valA));
  };
}

export function asc(column: any) {
  if (process.env.DATABASE_URL) {
    const { asc: drizzleAsc } = require("drizzle-orm");
    return drizzleAsc(column);
  }
  const colName = column?.name || column?.key || column;
  return (a: any, b: any) => {
    const valA = a[colName] ?? a[toCamelCase(colName)] ?? a.createdAt ?? a.id;
    const valB = b[colName] ?? b[toCamelCase(colName)] ?? b.createdAt ?? b.id;
    if (valA instanceof Date && valB instanceof Date) {
      return valA.getTime() - valB.getTime();
    }
    if (typeof valA === "number" && typeof valB === "number") {
      return valA - valB;
    }
    return String(valA).localeCompare(String(valB));
  };
}

export function and(...conditions: any[]) {
  if (process.env.DATABASE_URL) {
    const { and: drizzleAnd } = require("drizzle-orm");
    return drizzleAnd(...conditions);
  }
  return (record: any) => {
    return conditions.every((cond) => (typeof cond === "function" ? cond(record) : true));
  };
}

export const sql = (strings: any, ...values: any[]) => strings;

function toCamelCase(str: string): string {
  if (!str) return "";
  return str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
}

export * from "./schema";
