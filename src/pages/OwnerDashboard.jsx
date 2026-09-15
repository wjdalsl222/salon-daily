import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { PAYMENT_METHODS } from '../methods.js';
import { krw, hhmm, formatDateKor } from '../format.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const STATUS = {
  none:     { label: '미작성',    cls: 'badge-none' },
  draft:    { label: '작성 중',   cls: 'badge-draft' },
  completed:{ label: '정산 완료', cls: 'badge-completed' },
  dayoff:   { label: '휴무',      cls: 'badge-dayoff' },
};

const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
};

const dayTitle = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 ${['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]}요일`;
};

function Hero({ d }) {
  const st = STATUS[d.status] || STATUS.none;
  const caption =
    d.status === 'none'
      ? '아직 오늘 정산이 작성되지 않았어요. 매니저가 입력하면 실시간으로 반영돼요.'
      : d.status === 'draft'
        ? `${d.managerName || '매니저'}님이 지금 입력 중이에요 · ${hhmm(d.updatedAt)} 갱신`
        : d.status === 'dayoff'
          ? '오늘은 휴무일이에요. 매출 없음.'
          : `${hhmm(d.completedAt)} 마감 완료 · ${d.managerName || '매니저'}님 작성`;

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="label">오늘 정산 상태</span>
          <span className={`badge ${st.cls}`}>
            <span className="dot" />
            {st.label}
          </span>
        </div>
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {formatDateKor(d.date)}
        </span>
      </div>

      <div className="mt-7">
        <div className="label">오늘 총매출</div>
        <div className="mt-2 flex items-baseline gap-2 num">
          <span className="font-extrabold leading-none tracking-tight text-[44px] min-[420px]:text-[56px] sm:text-[60px] lg:text-[72px]">
            {krw(d.total)}
          </span>
          <span className="text-xl font-bold" style={{ color: 'var(--muted)' }}>원</span>
        </div>
        <p className="mt-4 text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>{caption}</p>
      </div>
    </section>
  );
}

function MethodGrid({ d }) {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PAYMENT_METHODS.map((m) => {
        const amt = d.items[m.key] || 0;
        const isCash = m.key === 'cash';
        return (
          <div key={m.key} className="card p-4 sm:p-5" style={isCash ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}>
            <div className="label">{isCash ? '현금 매출' : m.label}</div>
            <div className="mt-2 num font-extrabold text-[22px] sm:text-[26px] tracking-tight leading-none">
              {krw(amt)}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function CashDiff({ d }) {
  if (d.status === 'dayoff') return null;
  return (
    <section className="card p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="label">현금 차액 · 실제 보유액 − 장부 현금</div>
        <div className="mt-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          {d.actualCash == null ? '아직 현금 정보가 입력되지 않았어요' : `실제 보유 ${krw(d.actualCash)}원 · 장부 현금 ${krw(d.cashAmount)}원`}
        </div>
      </div>
      <div className="num text-right">
        {d.cashDiff == null ? (
          <span className="text-lg font-bold" style={{ color: 'var(--muted)' }}>—</span>
        ) : (
          <span className="font-extrabold text-[26px] tracking-tight" style={{ color: d.cashDiff < 0 ? 'var(--red)' : 'var(--emerald)' }}>
            {d.cashDiff < 0 ? '−' : '+'}{krw(Math.abs(d.cashDiff))}
            <span className="text-base ml-1" style={{ color: 'var(--muted)' }}>원</span>
          </span>
        )}
      </div>
    </section>
  );
}

function Note({ d }) {
  if (d.status === 'dayoff' || !d.note) return null;
  return (
    <section className="card p-5 sm:p-6">
      <div className="label">특이사항</div>
      <p className="mt-2 text-[15px] font-medium leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{d.note}</p>
    </section>
  );
}

function StatChip({ label, value, accent }) {
  return (
    <div className="rounded-xl px-3.5 py-2 flex flex-col" style={{ background: '#F7F4EC' }}>
      <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="num text-[14.5px] font-extrabold leading-none mt-1" style={{ color: accent || 'var(--ink)' }}>{value}</span>
    </div>
  );
}

function MonthChart({ daily, selDate, onSelect }) {
  const max = Math.max(1, ...daily.map((x) => x.total));
  return (
    <div className="mt-6 flex items-end gap-[3px] sm:gap-1 h-48 select-none">
      {daily.map((x) => {
        const h = x.total > 0 ? Math.max(10, Math.round((x.total / max) * 100)) : 5;
        const isSel = selDate === x.date;
        const clickable = !x.dayoff && (x.status === 'completed' || x.status === 'draft');
        const barBg = x.dayoff ? '#DDE3F0' : x.total > 0 ? (isSel ? 'var(--accent-deep)' : 'var(--accent)') : '#E6E0D0';
        const dayColor = x.isToday ? 'var(--accent)' : (x.weekday === 0 ? 'var(--red)' : x.weekday === 6 ? 'var(--sky)' : 'var(--muted)');
        return (
          <div
            key={x.date}
            className={`relative flex-1 min-w-0 h-full flex flex-col items-center justify-end group ${clickable ? 'cursor-pointer' : ''}`}
            onClick={clickable ? () => onSelect(x.date) : undefined}
          >
            <div
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap num text-[10px] font-extrabold rounded-md px-1.5 py-0.5 transition ${
                isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ bottom: `calc(${h}% + 14px)`, background: 'var(--ink)', color: '#fff' }}
            >
              {x.total > 0 ? `${(x.total / 10000).toFixed(0)}만` : ''}
            </div>
            <div
              className="w-full rounded-[3px] sm:rounded-[4px] transition"
              style={{ height: `${h}%`, background: barBg, opacity: x.total > 0 ? 1 : 0.7, boxShadow: isSel ? '0 0 0 2px var(--accent)' : undefined }}
            />
            <div className="mt-1.5 text-[9px] sm:text-[10px] font-bold leading-none" style={{ color: dayColor }}>
              {x.dayoff ? '·' : x.day}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayDetail({ x }) {
  if (!x) return null;
  const st = STATUS[x.status] || STATUS.none;
  return (
    <div className="mt-5 border-t" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap pt-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-extrabold text-[16px]">{dayTitle(x.date)}{x.isToday ? ' · 오늘' : ''}</span>
          <span className={`badge ${st.cls}`}><span className="dot" />{st.label}</span>
        </div>
        <div className="num font-extrabold text-[22px]">
          {x.status === 'dayoff' ? '—' : krw(x.total)}<span className="text-sm ml-1" style={{ color: 'var(--muted)' }}>원</span>
        </div>
      </div>

      {x.status === 'dayoff' && (
        <div className="mt-4 rounded-xl px-4 py-4 text-center text-[14px] font-semibold" style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>
          휴무일이에요 · 매출 없음
        </div>
      )}
      {x.status === 'none' && (
        <div className="mt-4 rounded-xl px-4 py-4 text-center text-[14px] font-semibold" style={{ background: '#EFECE4', color: '#6E6759' }}>
          정산이 작성되지 않은 날이에요
        </div>
      )}
      {(x.status === 'completed' || x.status === 'draft') && (
        <>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.key} className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: '#F7F4EC' }}>
                <span className="text-[12.5px] font-bold" style={{ color: 'var(--ink-soft)' }}>{m.label}</span>
                <span className="num text-[14px] font-extrabold">{krw(x.items[m.key])}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mt-3 text-[13px]">
            <span className="font-semibold" style={{ color: 'var(--ink-soft)' }}>현금 차액
              <span className="ml-1.5 num font-extrabold" style={{ color: x.cashDiff == null ? 'var(--muted)' : (x.cashDiff < 0 ? 'var(--red)' : 'var(--emerald)') }}>
                {x.cashDiff == null ? '—' : (x.cashDiff < 0 ? '−' : '+') + krw(Math.abs(x.cashDiff))}
              </span>
            </span>
            {x.managerName && <span className="font-semibold" style={{ color: 'var(--ink-soft)' }}>{x.managerName}님 작성</span>}
            {x.completedAt && <span className="font-semibold" style={{ color: 'var(--ink-soft)' }}>{hhmm(x.completedAt)} 마감</span>}
          </div>
          {x.note && (
            <div className="mt-3 rounded-xl px-4 py-3 text-[13.5px]" style={{ background: 'var(--amber-soft)' }}>
              <span className="font-extrabold mr-2" style={{ color: 'var(--amber)' }}>특이사항</span>
              <span className="font-medium" style={{ color: 'var(--ink-soft)' }}>{x.note}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MonthCard({ month, monthKey, onPrev, onNext, selDate, onSelect }) {
  const sel = month.daily.find((x) => x.date === selDate) || null;
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button className="btn btn-ghost h-9 w-9 !p-0 text-[15px] font-extrabold" onClick={onPrev} aria-label="이전 달">‹</button>
          <div className="card px-4 h-9 grid place-items-center text-[15px] font-extrabold min-w-[108px] justify-center">
            {monthLabel(monthKey)}
          </div>
          <button className="btn btn-ghost h-9 w-9 !p-0 text-[15px] font-extrabold" onClick={onNext} aria-label="다음 달">›</button>
        </div>
        <div className="text-right">
          <div className="label">월 누적 매출</div>
          <div className="num font-extrabold text-[26px] sm:text-[30px] tracking-tight leading-none mt-1">
            {krw(month.total)}<span className="text-sm ml-1" style={{ color: 'var(--muted)' }}>원</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatChip label="정산일 평균" value={`${krw(month.avgPerDay)}원`} />
        <StatChip label="최고 매출일" value={month.best ? `${Number(month.best.date.slice(8))}일 · ${krw(month.best.total)}원` : '—'} accent="var(--accent)" />
        <StatChip label="완료" value={`${month.daily.filter((x) => x.status === 'completed').length}일`} accent="var(--emerald)" />
        <StatChip label="휴무" value={`${month.daily.filter((x) => x.status === 'dayoff').length}일`} accent="var(--sky)" />
      </div>

      <MonthChart daily={month.daily} selDate={selDate} onSelect={onSelect} />

      <div className="mt-2.5 text-right text-[11.5px] font-semibold" style={{ color: 'var(--muted)' }}>
        막대를 누르면 그날 정산 상세를 볼 수 있어요
      </div>

      <DayDetail x={sel} />
    </section>
  );
}

export default function OwnerDashboard({ user, onLogout }) {
  const [d, setD] = useState(null);
  const [month, setMonth] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [err, setErr] = useState('');
  const viewingRef = useRef(''); // 현재 보고 있는 월

  const loadToday = useCallback(() => {
    api('/api/owner/dashboard')
      .then((x) => {
        setD(x);
        // 이번 달을 보고 있을 때만 월 카드도 함께 갱신 (실시간 반영)
        if (!viewingRef.current || viewingRef.current === x.month.key) {
          viewingRef.current = x.month.key;
          setMonth(x.month);
          setSelDate((sel) => (sel && x.month.daily.some((dd) => dd.date === sel) ? sel : null));
        }
      })
      .catch((e) => setErr(e.message));
  }, []);

  const loadMonth = useCallback((key) => {
    api(`/api/owner/month?key=${key}`)
      .then((m) => {
        viewingRef.current = m.key;
        setMonth(m);
        setSelDate((sel) => (sel && m.daily.some((dd) => dd.date === sel) ? sel : null));
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    loadToday();
    const t = setInterval(loadToday, 5000); // 매니저 입력 실시간 반영
    return () => clearInterval(t);
  }, [loadToday]);

  const goMonth = (delta) => {
    setSelDate(null);
    const next = shiftMonth(viewingRef.current || (d ? d.month.key : ''), delta);
    if (next === (d?.month.key || viewingRef.current)) {
      loadToday();
    } else {
      loadMonth(next);
    }
  };

  return (
    <div className="min-h-full">
      <OwnerHeader user={user} onLogout={onLogout} dateLabel={d ? formatDateKor(d.date) : ''} />

      {err && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          <div className="rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>잠시 연결에 문제가 있어요. 새로고침해 주세요.</div>
        </div>
      )}

      {!d || !month ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10 text-center" style={{ color: 'var(--muted)' }}>불러오는 중…</div>
      ) : (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-24 sm:pb-10 md:py-8 space-y-4">
          <Hero d={d} />
          <MethodGrid d={d} />
          <CashDiff d={d} />
          <Note d={d} />
          <MonthCard
            month={month}
            monthKey={month.key}
            onPrev={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            selDate={selDate}
            onSelect={setSelDate}
          />
        </main>
      )}
      <BottomNav />
    </div>
  );
}
