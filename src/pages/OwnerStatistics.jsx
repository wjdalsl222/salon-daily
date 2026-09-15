import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { PAYMENT_METHODS } from '../methods.js';
import { krw } from '../format.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${y}년 ${m}월`;
};
const short = (key) => {
  const [ , m] = key.split('-').map(Number);
  return `${m}월`;
};

function Hero({ cur, prev, diffPct }) {
  return (
    <section className="card p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] shrink-0">📊</span>
          <span className="num font-bold text-[15px] sm:text-[16px] truncate">이번 달 vs 지난 달</span>
        </div>
        <span className="badge shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <span className="dot" />월별 통계
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl p-4" style={{ background: 'var(--accent-soft)' }}>
          <div className="label" style={{ color: 'var(--accent)' }}>{cur ? short(cur.key) : ''} 매출</div>
          <div className="num font-extrabold text-[28px] sm:text-[34px] leading-none mt-1.5">{krw(cur?.total || 0)}</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] font-bold" style={{ color: 'var(--accent-deep)' }}>
            <span>완료 {cur?.completedCount || 0}일</span>
            <span>평균 {krw(cur?.avgPerDay || 0)}원</span>
          </div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#F7F4EC' }}>
          <div className="label">지난 달 {prev ? short(prev.key) : ''} 매출</div>
          <div className="num font-extrabold text-[28px] sm:text-[34px] leading-none mt-1.5">{krw(prev?.total || 0)}</div>
          {diffPct != null && (
            <div className="num text-[13px] font-extrabold mt-2" style={{ color: diffPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
              {diffPct >= 0 ? '▲' : '▼'} {Math.abs(diffPct)}% 전월 대비
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TrendChart({ months }) {
  if (!months || months.length === 0) return null;
  const max = Math.max(1, ...months.map((m) => m.total));
  return (
    <section className="card p-4 sm:p-6">
      <div className="flex items-end gap-1.5 sm:gap-3 mt-2 h-44">
        {months.map((m) => {
          const h = m.total > 0 ? Math.max(10, Math.round((m.total / max) * 100)) : 5;
          return (
            <div key={m.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1.5 h-full">
              <div className="num text-[10px] sm:text-[11px] font-extrabold truncate" style={{ color: 'var(--ink-soft)' }}>
                {(m.total / 10000).toFixed(0)}만
              </div>
              <div className="w-full rounded-[4px]" style={{ height: `${h}%`, background: 'var(--accent)', opacity: 0.85 }} />
              <div className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>{short(m.key)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MethodCompare({ cur, prev }) {
  if (!cur) return null;
  const prevSums = prev?.methodSums || {};
  return (
    <>
      <div className="label pt-1">결제수단별 매출 비교</div>
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PAYMENT_METHODS.map((m) => {
          const isCash = m.key === 'cash';
          const c = cur.methodSums[m.key] || 0;
          const p = prevSums[m.key] || 0;
          return (
            <div key={m.key} className="rounded-2xl px-4 py-3" style={isCash ? { border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' } : { border: '1px solid var(--line)', background: '#FFFEFB' }}>
              <div className="label">{isCash ? '현금 매출' : m.label}</div>
              <div className="mt-1.5 num font-extrabold text-[20px] sm:text-[22px] tracking-tight leading-none">{krw(c)}원</div>
              <div className="text-[11px] font-semibold mt-1" style={{ color: p ? 'var(--muted)' : 'var(--muted)' }}>
                지난달 {krw(p)}원
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

function MonthTable({ months }) {
  return (
    <>
      <div className="label pt-1">월간 상세</div>
      <section className="card p-3 sm:p-4">
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {[...months].reverse().map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-3 px-2 py-3">
              <div className="min-w-0">
                <div className="font-extrabold text-[15px]">{monthLabel(m.key)}</div>
                <div className="text-[11.5px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>
                  완료 {m.completedCount}일 · 휴무 {m.dayoffCount}일 · 평균 {krw(m.avgPerDay)}원
                </div>
              </div>
              <div className="text-right num">
                <div className="font-extrabold text-[17px]">{krw(m.total)}원</div>
                {m.best && <div className="text-[11.5px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>최고 {Number(m.best.date.slice(8))}일 {krw(m.best.total)}원</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function OwnerStatistics({ user, onLogout }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/owner/statistics')
      .then(setS)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="min-h-full">
      <OwnerHeader user={user} onLogout={onLogout} dateLabel="월별 통계" />

      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 pb-24 sm:pb-10 md:py-8 space-y-4">
        {err && (
          <div className="rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{err}</div>
        )}

        {!s ? (
          <div className="text-center py-10" style={{ color: 'var(--muted)' }}>불러오는 중…</div>
        ) : (
          <>
            <Hero cur={s.current} prev={s.previous} diffPct={s.diffPct} />

            <div className="label pt-1">월별 매출 추이</div>
            <TrendChart months={s.months} />

            <MethodCompare cur={s.current} prev={s.previous} />
            <MonthTable months={s.months} />
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
