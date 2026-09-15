import { db } from './db.js';
import { hashPassword } from './auth.js';
import { emptyItems, amountSum, todayKST } from './constants.js';

const today = todayKST();

// ---- 시드: 계정 ----
const upsertUser = (name, username, password, role) => {
  db.prepare(
    `INSERT INTO users (name, username, password_hash, role, active)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(username) DO UPDATE SET name=excluded.name, role=excluded.role, password_hash=excluded.password_hash, active=1`
  ).run(name, username, hashPassword(password), role);
};

upsertUser('원장님', 'owner', '1234', 'owner');
upsertUser('매니저', 'manager', '1234', 'manager');

// ---- 시드: 월간 과거 정산 (이번 달 1일 ~ 어제) ----
// 2026-09: 1..14 중 7일(월), 13일(일) 제외 -> 이번 달 월요일 휴무 스타일
const seeded = (() => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
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
  if (date >= today) continue; // 오늘 이후는 제외
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
  const actualCash = cash + rand(0, 40000); // 보유 현금 약간 차이

  db.prepare(
    `INSERT OR IGNORE INTO settlements (date, status, manager_id, note, actual_cash, submitted_at, completed_at)
     VALUES (?, 'completed', (SELECT id FROM users WHERE username='manager'), '', ?, ?, ?)`
  ).run(date, actualCash, `${date} 19:24`, `${date} 19:30`);

  const s = db.prepare(`SELECT id FROM settlements WHERE date=?`).get(date);
  const ins = db.prepare(
    `INSERT OR IGNORE INTO settlement_items (settlement_id, method, amount) VALUES (?, ?, ?)`
  );
  for (const [k, v] of Object.entries(amounts)) ins.run(s.id, k, v);

  // 시드: 일부 날짜에 완료 후 수정 기록 (타임라인 데모용)
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

// ---- 시드: 어제 + 오늘 기본 상태 ----
// 오늘: 아직 미작성 (빈 상태) / 이번 달 월요일 휴무 데이터
for (const row of seeded) {
  const dt = new Date(row.date + 'T00:00:00');
  if (dt.getDay() === 1) {
    db.prepare(`INSERT OR IGNORE INTO day_offs (date, note, created_by) VALUES (?, ?, (SELECT id FROM users WHERE username='manager'))`)
      .run(row.date, '매주 월요일 정기 휴무');
  }
}

db.prepare(`DELETE FROM settlements WHERE date=? AND status='draft'`).run(today);

console.log(`✔ 시드 완료 (오늘: ${today})`);
console.log(`  계정: owner/1234 (원장님), manager/1234 (매니저)`);
