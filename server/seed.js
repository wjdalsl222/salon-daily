import { db } from './db.js';
import { hashPassword } from './auth.js';
import { emptyItems, amountSum, todayKST } from './constants.js';

// ---------------------------------------------------------------
//  계정: 기본 2개 보장
//  - 재실행 시 기존 비밀번호 유지 (RESET_PASSWORDS=1 이면 1234로 초기화)
// ---------------------------------------------------------------
const doReset = process.env.RESET_PASSWORDS === '1';
const upsertUser = (name, username, password, role) => {
  if (doReset) {
    db.prepare(
      `INSERT INTO users (name, username, password_hash, role, active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(username) DO UPDATE SET name=excluded.name, role=excluded.role, password_hash=excluded.password_hash, active=1`
    ).run(name, username, hashPassword(password), role);
  } else {
    db.prepare(
      `INSERT INTO users (name, username, password_hash, role, active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(username) DO UPDATE SET name=excluded.name, role=excluded.role, active=1`
    ).run(name, username, hashPassword(password), role);
  }
};

upsertUser('원장님', 'owner', '1234', 'owner');
upsertUser('매니저', 'manager', '1234', 'manager');

// ---------------------------------------------------------------
//  데모 데이터: SEED_DEMO=1 일 때만 생성 (실사용 DB 오염 방지)
// ---------------------------------------------------------------
if (process.env.SEED_DEMO !== '1') {
  console.log(`✔ 계정 준비 완료 (데모 데이터는 SEED_DEMO=1 로만 생성)`);
  process.exit(0);
}

const today = todayKST();
console.log(`✔ 데모 데이터 생성 (오늘: ${today})`);

const seeded = (() => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const rows = [];
  for (let day = 1; day <= last; day++) {
    const dt = new Date(year, month, day);
    if (dt.getDay() === 1 && day < new Date().getDate()) continue; // 월요일 휴무
    rows.push({ day, date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, weekday: dt.getDay() });
  }
  return rows;
})();

const rand = (min, max) => Math.floor(min + Math.random() * (max - min));

for (const { date, weekday } of seeded) {
  if (date >= today) continue;
  const weekend = weekday === 0 || weekday === 6;
  const base = weekend ? rand(2100000, 2600000) : rand(1400000, 1900000);
  const card = Math.round(base * rand(35, 45) / 100);
  const cash = Math.round(base * rand(15, 22) / 100);
  const naverpay = Math.round(base * rand(18, 26) / 100);
  const asanpay = Math.round(base * rand(4, 9) / 100);
  const bank = Math.round(base * rand(6, 10) / 100);
  const etc = Math.max(0, base - card - cash - naverpay - asanpay - bank);
  const amounts = { card, cash, naverpay, asanpay, bank, etc };
  const total = amountSum(amounts);
  const actualCash = cash + rand(0, 40000);

  db.prepare(
    `INSERT OR IGNORE INTO settlements (date, status, manager_id, note, actual_cash, submitted_at, completed_at)
     VALUES (?, 'completed', (SELECT id FROM users WHERE username='manager'), '', ?, ?, ?)`
  ).run(date, actualCash, `${date} 19:24`, `${date} 19:30`);

  const s = db.prepare(`SELECT id FROM settlements WHERE date=?`).get(date);
  const ins = db.prepare(
    `INSERT OR IGNORE INTO settlement_items (settlement_id, method, amount) VALUES (?, ?, ?)`
  );
  for (const [k, v] of Object.entries(amounts)) ins.run(s.id, k, v);

  // 일부 날짜에 완료 후 수정 기록 (타임라인 데모용)
  const dayNum = Number(date.slice(8, 10));
  if (dayNum === 1 || dayNum === 10) {
    const alreadyMod = db.prepare(
      `SELECT 1 FROM edit_logs l JOIN settlements x ON x.id=l.settlement_id
       WHERE x.date=? AND l.action='modify'`
    ).get(date);
    if (!alreadyMod) {
      db.prepare(
        `INSERT INTO edit_logs (settlement_id, editor_id, action, changes, created_at)
         VALUES (?, (SELECT id FROM users WHERE username='manager'), 'modify', ?, ?)`
      ).run(s.id, dayNum === 1 ? '금액 변경: 카드, 현금 / 현금 보유액 변경' : '금액 변경: 네이버페이', `${date} 21:0${dayNum === 1 ? '4' : '8'}`);
    }
  }
}

// 월요일 정기 휴무 데모
for (const row of seeded) {
  const dt = new Date(row.date + 'T00:00:00');
  if (dt.getDay() === 1) {
    db.prepare(`INSERT OR IGNORE INTO day_offs (date, note, created_by) VALUES (?, ?, (SELECT id FROM users WHERE username='manager'))`)
      .run(row.date, '매주 월요일 정기 휴무');
  }
}

db.prepare(`DELETE FROM settlements WHERE date=? AND status='draft'`).run(today);

console.log(`  계정: owner/1234 (원장님), manager/1234 (매니저)`);
