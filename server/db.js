import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { hashPassword, verifyPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DB_PATH || path.join(dataDir, 'salon.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  manager_id INTEGER,
  note TEXT NOT NULL DEFAULT '',
  actual_cash INTEGER,
  submitted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settlement_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  settlement_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  UNIQUE (settlement_id, method)
);

CREATE TABLE IF NOT EXISTS edit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  settlement_id INTEGER NOT NULL,
  editor_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('complete','modify')),
  changes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS day_offs (
  date TEXT PRIMARY KEY,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

// 첫 기동 시 계정이 하나도 없으면 기본 계정 자동 생성 (Docker 첫 실행 대비 — 로그인 불가 방지)
export function ensureDefaultUsers() {
  const c = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (c > 0) return 0;
  const ins = db.prepare(`INSERT INTO users (name, username, password_hash, role, active) VALUES (?, ?, ?, ?, 1)`);
  ins.run('원장님', 'owner', hashPassword('1234'), 'owner');
  ins.run('매니저', 'manager', hashPassword('1234'), 'manager');
  return 2;
}

ensureDefaultUsers();

export function mapUser(row) {
  if (!row) return null;
  // 기본 비밀번호(1234) 사용 중인지 플래그 — 실사용 안전 유도용
  let needsDefaultPassword = false;
  try {
    needsDefaultPassword = verifyPassword('1234', row.password_hash);
  } catch { /* 다르면 false 유지 */ }
  return { id: row.id, name: row.name, username: row.username, role: row.role, needsDefaultPassword };
}
