import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { PAYMENT_METHODS } from '../methods.js';
import { krw, hhmm, formatDateKor } from '../format.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const STATUS_LABEL = { none: '미작성', draft: '작성 중', completed: '정산 완료', dayoff: '휴무' };
const STATUS_STYLE = {
  none: { background: '#EFECE4', color: '#6E6759' },
  draft: { background: 'var(--amber-soft)', color: 'var(--amber)' },
  completed: { background: 'var(--emerald-soft)', color: 'var(--emerald)' },
  dayoff: { background: 'var(--sky-soft)', color: 'var(--sky)' },
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
  const st = d.status;
  const caption =
    st === 'none'
      ? '아직 오늘 정산이 없어요. 매니저가 입력하면 실시간으로 올라와요.'
      : st === 'draft'
        ? `${d.managerName || '매니저'}님이 지금 입력 중이에요 · ${hhmm(d.updatedAt)} 갱신`
        : st === 'dayoff'
          ? '오늘은 휴무일이에요 · 매출 없음'
          : `${hhmm(d.completedAt)} 마감 완료 · ${d.managerName || '매니저'}님 작성`;

  return (
    <section className="card p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] shrink-0">📅</span>
          <span className="num font-bold text-[15px] sm:text-[16px] truncate">{formatDateKor(d.date)}</span>
        </div>
        <span className="badge shrink-0" style={STATUS_STYLE[st] || {}}>
          <span className="dot" />
          {STATUS_LABEL[st] || ''}
        </span>
      </div>

      <div className="mt-5">
        <div className="label">오늘 총매출</div>
        <div className="mt-1.5 num font-extrabold leading-none tracking-tight text-[46px] min-[420px]:text-[54px] sm:text-[64px]">
          {krw(d.total)}<span className="text-lg font-bold ml-1" style={{ color: 'var(--muted)' }}>원</span>
        </div>
      </div>

      <p className="mt-4 text-[13px] font-medium" style={{ color: 'var(--ink-soft)' }}>{caption}</p>
    </section>
  );
}

function TodayMethods({ d }) {
  return (
    <>
      <div className="label pt-1">오늘 결제수단별 매출</div>
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PAYMENT_METHODS.map((m) => {
          const amt = d.items[m.key] || 0;
          const isCash = m.key === 'cash';
          return (
            <div key={m.key} className="rounded-2xl px-4 py-3" style={isCash ? { border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' } : { border: '1px solid var(--line)', background: '#FFFEFB' }}>
              <div className="label">{isCash ? '현금 매출' : m.label}</div>
              <div className="mt-1.5 num font-extrabold text-[22px] sm:text-[24px] tracking-tight leading-none">{krw(amt)}</div>
            </div>
          );
        })}
      </section>
    </>
  );
}

function TodayCash({ d }) {
  if (d.status === 'dayoff') return null;
  return (
    <>
      <div className="label pt-1">현금 차액</div>
      <section className="card p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[12.5px]" style={{ color: 'var(--muted)' }}>실제 보유액 − 장부 현금</div>
          {d.actualCash != null && (
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
              보유 {krw(d.actualCash)} · 장부 {krw(d.cashAmount)}
            </div>
          )}
        </div>
        <div className="num font-extrabold text-[26px] tracking-tight" style={{ color: d.cashDiff == null ? 'var(--muted)' : (d.cashDiff < 0 ? 'var(--red)' : 'var(--emerald)') }}>
          {d.cashDiff == null ? '—' : (d.cashDiff < 0 ? '−' : '+') + krw(Math.abs(d.cashDiff)) + '원'}
        </div>
      </section>
    </>
  );
}

function TodayNote({ d }) {
  if (d.status === 'dayoff' || !d.note) return null;
  return (
    <section className="card p-4" style={{ background: 'var(--amber-soft)', borderColor: 'transparent' }}>
      <span className="label mr-2" style={{ color: 'var(--amber)' }}>특이사항</span>
      <span className="text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>{d.note}</span>
    </section>
  );
}

function StatChip({ label, value, accent }) {
  return (
    <div className="rounded-xl px-3.5 py-2 flex flex-col min-w-[92px]" style={{ background: '#F7F4EC' }}>
      <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="num text-[14.5px] font-extrabold leading-none mt-1 truncate" style={{ color: accent || 'var(--ink)' }}>{value}</span>
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
  const st = x.status;
  return (
    <div className="mt-5 border-t" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap pt-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-extrabold text-[16px]">{dayTitle(x.date)}{x.isToday ? ' · 오늘' : ''}</span>
          <span className="badge" style={STATUS_STYLE[st] || {}}><span className="dot" />{STATUS_LABEL[st] || ''}</span>
        </div>
        <div className="num font-extrabold text-[22px]">
          {st === 'dayoff' ? '—' : krw(x.total)}<span className="text-sm ml-1" style={{ color: 'var(--muted)' }}>원</span>
        </div>
      </div>

      {st === 'dayoff' && (
        <div className="mt-4 rounded-xl px-4 py-4 text-center text-[14px] font-semibold" style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>휴무일이에요 · 매출 없음</div>
      )}
      {st === 'none' && (
        <div className="mt-4 rounded-xl px-4 py-4 text-center text-[14px] font-semibold" style={{ background: '#EFECE4', color: '#6E6759' }}>정산이 작성되지 않은 날이에요</div>
      )}
      {(st === 'completed' || st === 'draft') && (
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
    <section className="card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button className="btn btn-ghost h-9 w-9 !p-0 text-[15px] font-extrabold" onClick={onPrev} aria-label="이전 달">‹</button>
          <div className="card px-3.5 h-9 grid place-items-center text-[14.5px] font-extrabold min-w-[100px] justify-center">{monthLabel(monthKey)}</div>
          <button className="btn btn-ghost h-9 w-9 !p-0 text-[15px] font-extrabold" onClick={onNext} aria-label="다음 달">›</button>
        </div>
        <div className="text-right">
          <div className="label">월 누적 매출</div>
          <div className="num font-extrabold text-[24px] sm:text-[28px] tracking-tight leading-none mt-1">
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

      <div className="mt-2.5 text-right text-[11.5px] font-semibold" style={{ color: 'var(--muted)' }}>막대를 누르면 그날 정산 상세를 볼 수 있어요</div>

      <DayDetail x={sel} />
    </section>
  );
}

export default function OwnerDashboard({ user, onLogout }) {
  const [d, setD] = useState(null);
  const [month, setMonth] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [err, setErr] = useState('');
  const viewingRef = useRef('');

  const loadToday = useCallback(() => {
    api('/api/owner/dashboard')
      .then((x) => {
        setD(x);
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
    const t = setInterval(loadToday, 5000);
    return () => clearInterval(t);
  }, [loadToday]);

  const goMonth = (delta) => {
    setSelDate(null);
    const next = shiftMonth(viewingRef.current || (d ? d.month.key : ''), delta);
    if (next === (d?.month.key || viewingRef.current)) loadToday();
    else loadMonth(next);
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
        <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-24 sm:pb-10 md:py-8 space-y-4 md:space-y-5">
          <Hero d={d} />
          <TodayMethods d={d} />
          <TodayCash d={d} />
          <TodayNote d={d} />
          <div className="label pt-1">월간 매출</div>
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
