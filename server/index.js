import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, mapUser } from './db.js';
import { verifyPassword, hashPassword } from './auth.js';
import {
  PAYMENT_METHODS, emptyItems, amountSum, todayKST, METHOD_ORDER,
} from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 4000;

// ---------- 세션 (쿠키 기반) ----------
const sessions = new Map(); // token -> userId

function cookieSid(req) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith('sid='));
  return found ? found.slice(4) : null;
}

function currentUser(req) {
  const token = cookieSid(req);
  if (!token) return null;
  const uid = sessions.get(token);
  if (!uid) return null;
  return mapUser(db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(uid));
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  req.user = user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    next();
  };
}

// ---------- 정산 헬퍼 ----------
function getItems(settlementId) {
  const items = emptyItems();
  const rows = db.prepare('SELECT method, amount FROM settlement_items WHERE settlement_id=?').all(settlementId);
  for (const r of rows) if (r.method in items) items[r.method] = r.amount;
  return items;
}

function upsertItems(settlementId, items) {
  const stmt = db.prepare(`
    INSERT INTO settlement_items (settlement_id, method, amount) VALUES (?, ?, ?)
    ON CONFLICT(settlement_id, method) DO UPDATE SET amount=excluded.amount
  `);
  for (const k of METHOD_ORDER) {
    const v = Math.max(0, Math.round(Number(items?.[k]) || 0));
    stmt.run(settlementId, k, v);
  }
}

function diffItems(a, b) {
  return METHOD_ORDER.filter((k) => (Number(a?.[k]) || 0) !== (Number(b?.[k]) || 0));
}

function managerState(date = todayKST()) {
  const dayoff = db.prepare('SELECT * FROM day_offs WHERE date=?').get(date);
  const s = db.prepare('SELECT * FROM settlements WHERE date=?').get(date);
  if (!s) {
    return {
      date, status: 'none', dayoff: !!dayoff,
      items: emptyItems(), total: 0, itemsTotal: 0,
      actualCash: null, cashDiff: 0,
      note: '', managerName: null, submittedAt: null, completedAt: null,
      editLogs: [],
    };
  }
  const items = getItems(s.id);
  const total = amountSum(items);
  const cashAmount = Number(items.cash) || 0;
  const actualCash = s.actual_cash;
  const cashDiff = actualCash == null ? null : actualCash - cashAmount;
  const manager = s.manager_id ? db.prepare('SELECT name FROM users WHERE id=?').get(s.manager_id) : null;
  const logs = db.prepare(
    `SELECT l.*, u.name AS editor FROM edit_logs l
     LEFT JOIN users u ON u.id = l.editor_id
     WHERE l.settlement_id=? ORDER BY l.id DESC LIMIT 10`
  ).all(s.id);
  return {
    date, status: s.status, dayoff: !!dayoff,
    items, total,
    actualCash, cashDiff,
    note: s.note || '', managerName: manager?.name || null,
    submittedAt: s.submitted_at, completedAt: s.completed_at,
    updated_at: s.updated_at,
    editLogs: logs,
  };
}

// 월간 통계 + 일별 상세 데이터 구성 (대시보드와 /api/owner/month 공용)
function buildMonth(monthKey, todayDate) {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayDay = Number(todayDate.slice(8, 10));
  const prefix = `${String(y)}-${String(m).padStart(2, '0')}`;
  const srows = db.prepare(
    `SELECT s.id, s.date, s.status, s.note, s.actual_cash, s.completed_at, s.manager_id
     FROM settlements s WHERE s.date LIKE ?`
  ).all(`${prefix}-%`);
  const smap = {};
  for (const r of srows) smap[r.date] = r;
  const doffs = new Set(
    db.prepare('SELECT date FROM day_offs WHERE date LIKE ?').all(`${prefix}-%`).map((r) => r.date)
  );

  const daily = [];
  let total = 0;
  let completedCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${prefix}-${String(d).padStart(2, '0')}`;
    const dayoff = doffs.has(key);
    const isToday = d === todayDay && prefix === todayDate.slice(0, 7);
    const r = smap[key];
    const status = dayoff ? 'dayoff' : (!r ? 'none' : r.status);
    let items = emptyItems();
    let dayTotal = 0;
    let actualCash = null;
    let cashDiff = null;
    let note = '';
    let completedAt = null;
    let managerName = null;
    if (r) {
      items = getItems(r.id);
      dayTotal = amountSum(items);
      const cashAmt = Number(items.cash) || 0;
      actualCash = r.actual_cash;
      cashDiff = actualCash == null ? null : actualCash - cashAmt;
      note = r.note || '';
      completedAt = r.completed_at;
      managerName = r.manager_id ? (db.prepare('SELECT name FROM users WHERE id=?').get(r.manager_id)?.name || null) : null;
    }
    if (status === 'completed') { total += dayTotal; completedCount++; }
    daily.push({
      date: key, day: d, weekday: new Date(y, m - 1, d).getDay(),
      isToday, dayoff, status, total: dayTotal, items,
      actualCash, cashDiff, note, completedAt, managerName,
    });
  }
  const avgPerDay = completedCount ? Math.round(total / completedCount) : 0;
  const best = daily
    .filter((x) => x.status === 'completed' && x.total > 0)
    .reduce((a, x) => (!a || x.total > a.total ? x : a), null);
  return {
    key: prefix, total, avgPerDay,
    best: best ? { date: best.date, total: best.total } : null,
    daily,
  };
}

function ownerDashboard(date = todayKST()) {
  const dayoff = db.prepare('SELECT * FROM day_offs WHERE date=?').get(date);
  const s = db.prepare('SELECT * FROM settlements WHERE date=?').get(date);
  const items = s ? getItems(s.id) : emptyItems();
  const total = s ? amountSum(items) : 0;
  const cashAmount = Number(items.cash) || 0;
  const actualCash = s?.actual_cash == null ? null : s.actual_cash;
  const cashDiff = actualCash == null ? null : actualCash - cashAmount;
  const manager = s?.manager_id ? db.prepare('SELECT name FROM users WHERE id=?').get(s.manager_id) : null;

  // 월간 누적 + 일별 상세 (buildMonth 공용)
  const month = buildMonth(`${date.slice(0, 4)}-${date.slice(5, 7)}`, date);

  return {
    date,
    status: dayoff ? 'dayoff' : (!s ? 'none' : s.status),
    total,
    items,
    cashAmount, actualCash, cashDiff,
    note: s?.note || '',
    managerName: manager?.name || null,
    updatedAt: s?.updated_at || null,
    completedAt: s?.completed_at || null,
    month,
  };
}

// ---------- 인증 API ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(String(username || '').trim());
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
  res.json({ user: mapUser(user) });
});

app.post('/api/logout', (req, res) => {
  const token = cookieSid(req);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  res.json({ user });
});

// ---------- 계정 관리 API ----------
// 자기 비밀번호 변경 (원장·매니저 공통)
app.post('/api/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!row || !verifyPassword(String(currentPassword || ''), row.password_hash)) {
    return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
  }
  const pw = String(newPassword || '');
  if (pw.length < 4) return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(pw), row.id);
  res.json({ ok: true });
});

// 원장 전용: 계정 목록 (매니저 관리용)
app.get('/api/users', requireAuth, requireRole('owner'), (_req, res) => {
  const users = db.prepare(
    `SELECT id, name, username, role, active FROM users WHERE active=1 ORDER BY role DESC, id`
  ).all();
  res.json({ users });
});

// 원장 전용: 계정 비밀번호 재설정
app.post('/api/users/:id/password', requireAuth, requireRole('owner'), (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: '사용자를 찾을 수 없습니다.' });
  if (id === req.user.id) return res.status(400).json({ error: '자신의 비밀번호는 비밀번호 변경을 이용해 주세요.' });
  const pw = String(req.body?.newPassword || '');
  if (pw.length < 4) return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
  const target = db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(id);
  if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(pw), id);
  res.json({ ok: true });
});

// ---------- 원장님 API ----------
app.get('/api/owner/dashboard', requireAuth, requireRole('owner'), (req, res) => {
  res.json(ownerDashboard());
});

app.get('/api/owner/history', requireAuth, requireRole('owner'), (req, res) => {
  const q = req.query.month;
  const mm = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q)) ? String(q) : todayKST().slice(0, 7);
  const [y, m] = mm.split('-').map(Number);
  const daysIn = new Date(y, m, 0).getDate();
  const rows = db.prepare(
    `SELECT s.id, s.date, s.status, s.note, s.actual_cash, s.completed_at, s.manager_id
     FROM settlements s WHERE s.date LIKE ?`
  ).all(`${mm}-%`);
  const smap = {};
  for (const r of rows) smap[r.date] = r;
  const doffs = new Set(
    db.prepare('SELECT date FROM day_offs WHERE date LIKE ?').all(`${mm}-%`).map((r) => r.date)
  );

  const days = [];
  for (let day = 1; day <= daysIn; day++) {
    const key = `${mm}-${String(day).padStart(2, '0')}`;
    const dayoff = doffs.has(key);
    const r = smap[key];
    const status = dayoff ? 'dayoff' : (!r ? 'none' : r.status);
    let total = 0;
    let items = emptyItems();
    let actualCash = null;
    let cashDiff = null;
    let managerName = null;
    let note = '';
    let completedAt = null;
    if (r) {
      items = getItems(r.id);
      total = amountSum(items);
      const cashAmt = Number(items.cash) || 0;
      actualCash = r.actual_cash;
      cashDiff = actualCash == null ? null : actualCash - cashAmt;
      note = r.note || '';
      completedAt = r.completed_at;
      managerName = r.manager_id ? (db.prepare('SELECT name FROM users WHERE id=?').get(r.manager_id)?.name || null) : null;
    }
    days.push({
      date: key,
      day,
      weekday: new Date(y, m - 1, day).getDay(),
      status, total, items, actualCash, cashDiff, note, completedAt, managerName,
    });
  }
  res.json({ month: mm, days });
});

app.get('/api/owner/month', requireAuth, requireRole('owner'), (req, res) => {
  const key = String(req.query.key || '');
  const mm = /^\d{4}-(0[1-9]|1[0-2])$/.test(key) ? key : todayKST().slice(0, 7);
  res.json(buildMonth(mm, todayKST()));
});

app.get('/api/owner/statistics', requireAuth, requireRole('owner'), (_req, res) => {
  const today = todayKST();
  const cy = Number(today.slice(0, 4));
  const cm = Number(today.slice(5, 7));
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d0 = new Date(cy, cm - 1 - i, 1);
    const key = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}`;
    const m = buildMonth(key, today);
    const methodSums = {};
    for (const dd of m.daily) {
      if (dd.status !== 'completed') continue;
      for (const [k, v] of Object.entries(dd.items)) methodSums[k] = (methodSums[k] || 0) + v;
    }
    months.push({
      key,
      total: m.total,
      completedCount: m.daily.filter((x) => x.status === 'completed').length,
      dayoffCount: m.daily.filter((x) => x.status === 'dayoff').length,
      avgPerDay: m.avgPerDay,
      best: m.best,
      methodSums,
    });
  }
  for (let i = 1; i < months.length; i++) months[i].prevTotal = months[i - 1].total;
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const diffPct = previous && previous.total ? Math.round(((current.total - previous.total) / previous.total) * 1000) / 10 : null;
  res.json({ months, current, previous, diffPct });
});

app.get('/api/owner/settlement/:date', requireAuth, requireRole('owner'), (req, res) => {
  const date = String(req.params.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다.' });

  const dayoff = db.prepare('SELECT * FROM day_offs WHERE date=?').get(date);
  const s = db.prepare('SELECT * FROM settlements WHERE date=?').get(date);
  const status = dayoff ? 'dayoff' : (!s ? 'none' : s.status);

  let items = emptyItems();
  let total = 0;
  let actualCash = null;
  let cashDiff = null;
  let managerName = null;
  let submittedAt = null;
  if (s) {
    items = getItems(s.id);
    total = amountSum(items);
    actualCash = s.actual_cash;
    const cashAmt = Number(items.cash) || 0;
    cashDiff = actualCash == null ? null : actualCash - cashAmt;
    managerName = s.manager_id ? (db.prepare('SELECT name FROM users WHERE id=?').get(s.manager_id)?.name || null) : null;
    submittedAt = s.submitted_at;
  }

  // 수정 기록 (complete + modify) 최신순
  let editLogs = [];
  if (s) {
    editLogs = db.prepare(
      `SELECT l.id, l.action, l.changes, l.created_at, u.name AS editor
       FROM edit_logs l LEFT JOIN users u ON u.id = l.editor_id
       WHERE l.settlement_id=? ORDER BY l.id DESC`
    ).all(s.id);
  }

  // 최근 수정 사항 (완료 후 modify 중 가장 최근 1건) — 상단 강조용
  const recentModify = s
    ? db.prepare(
        `SELECT changes, l.created_at, u.name AS editor FROM edit_logs l
         LEFT JOIN users u ON u.id = l.editor_id
         WHERE l.settlement_id=? AND l.action='modify' ORDER BY l.id DESC LIMIT 1`
      ).get(s.id) || null
    : null;

  res.json({
    date, status, dayoff: !!dayoff,
    items, total, actualCash, cashDiff,
    note: s?.note || '',
    managerName, submittedAt, completedAt: s?.completed_at || null,
    editLogs, recentModify,
    monthKey: date.slice(0, 7),
  });
});

// ---------- 매니저 API ----------
app.get('/api/manager/today', requireAuth, requireRole('manager'), (req, res) => {
  res.json(managerState());
});

app.put('/api/manager/today', requireAuth, requireRole('manager'), (req, res) => {
  const { items, actualCash, note } = req.body || {};
  const date = todayKST();

  db.prepare('DELETE FROM day_offs WHERE date=?').run(date); // 정산이 생기면 휴무 취소

  let s = db.prepare('SELECT * FROM settlements WHERE date=?').get(date);
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });

  if (!s) {
    const r = db.prepare(
      `INSERT INTO settlements (date, status, manager_id, note, actual_cash, submitted_at)
       VALUES (?, 'draft', ?, ?, ?, ?)`
    ).run(date, req.user.id, String(note || '').trim(), actualCash == null ? null : Math.round(Number(actualCash) || 0), now);
    s = db.prepare('SELECT * FROM settlements WHERE id=?').get(r.lastInsertRowid);
  } else {
    // 완료 상태 수정이면 수정 기록 저장
    if (s.status === 'completed') {
      const oldItems = getItems(s.id);
      const changed = diffItems(oldItems, items);
      const diff = [];
      if (changed.length) diff.push(`금액 변경: ${changed.map((k) => PAYMENT_METHODS.find((p) => p.key === k).label).join(', ')}`);
      const oldCash = s.actual_cash;
      const newCash = actualCash == null ? null : Math.round(Number(actualCash) || 0);
      if (oldCash !== newCash) diff.push('현금 보유액 변경');
      if (String(s.note || '') !== String(note || '').trim()) diff.push('특이사항 변경');
      if (diff.length) {
        db.prepare(
          `INSERT INTO edit_logs (settlement_id, editor_id, action, changes) VALUES (?, ?, 'modify', ?)`
        ).run(s.id, req.user.id, diff.join(' / '));
      }
    }
    db.prepare(
      `UPDATE settlements SET manager_id=?, note=?, actual_cash=?, updated_at=? WHERE id=?`
    ).run(
      req.user.id,
      String(note || '').trim(),
      actualCash == null ? null : Math.round(Number(actualCash) || 0),
      now, s.id
    );
  }

  upsertItems(s.id, items);
  res.json(managerState(date));
});

app.post('/api/manager/today/complete', requireAuth, requireRole('manager'), (req, res) => {
  const { items, actualCash, note } = req.body || {};
  const date = todayKST();

  db.prepare('DELETE FROM day_offs WHERE date=?').run(date);

  let s = db.prepare('SELECT * FROM settlements WHERE date=?').get(date);
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });

  if (!s) {
    const r = db.prepare(
      `INSERT INTO settlements (date, status, manager_id, note, actual_cash, submitted_at, completed_at)
       VALUES (?, 'completed', ?, ?, ?, ?, ?)`
    ).run(date, req.user.id, String(note || '').trim(), actualCash == null ? null : Math.round(Number(actualCash) || 0), now, now);
    s = db.prepare('SELECT * FROM settlements WHERE id=?').get(r.lastInsertRowid);
  } else {
    db.prepare(
      `UPDATE settlements SET status='completed', manager_id=?, note=?, actual_cash=?, completed_at=?, updated_at=? WHERE id=?`
    ).run(req.user.id, String(note || '').trim(), actualCash == null ? null : Math.round(Number(actualCash) || 0), now, now, s.id);
  }

  upsertItems(s.id, items);
  db.prepare(
    `INSERT INTO edit_logs (settlement_id, editor_id, action, changes) VALUES (?, ?, 'complete', ?)`
  ).run(s.id, req.user.id, '정산 완료');

  res.json(managerState(date));
});

app.post('/api/manager/today/dayoff', requireAuth, requireRole('manager'), (req, res) => {
  const date = todayKST();
  const completed = db.prepare(`SELECT 1 FROM settlements WHERE date=? AND status='completed'`).get(date);
  if (completed) return res.status(400).json({ error: '이미 정산이 완료된 날은 휴무로 변경할 수 없습니다.' });
  db.prepare('DELETE FROM settlements WHERE date=?').run(date);
  db.prepare('INSERT OR IGNORE INTO day_offs (date, note, created_by) VALUES (?, ?, ?)')
    .run(date, String(req.body?.note || '').trim(), req.user.id);
  res.json(managerState(date));
});

app.post('/api/manager/today/undayooff', requireAuth, requireRole('manager'), (req, res) => {
  db.prepare('DELETE FROM day_offs WHERE date=?').run(todayKST());
  res.json(managerState());
});

// ---------- 정적 서빙 (SPA) ----------
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`✔ 살롱 데일리 서버 실행 중 → http://localhost:${PORT}`);
});
