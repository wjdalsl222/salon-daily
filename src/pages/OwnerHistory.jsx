import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { krw, hhmm } from '../format.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const STATUS = {
  none:      { label: '미작성', cls: 'badge-none' },
  draft:     { label: '작성 중', cls: 'badge-draft' },
  completed: { label: '정산 완료', cls: 'badge-completed' },
  dayoff:    { label: '휴무', cls: 'badge-dayoff' },
};

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'completed', label: '정산 완료' },
  { key: 'draft', label: '작성 중' },
  { key: 'dayoff', label: '휴무' },
  { key: 'none', label: '미작성' },
];

const dowKo = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
};

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
};

const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dayTitle = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 ${['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]}요일`;
};

function DayRow({ d, todayDate, onOpen }) {
  const st = STATUS[d.status] || STATUS.none;
  const isToday = d.date === todayDate;
  return (
    <div className="card">
      <button
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left cursor-pointer hover:bg-[#FBF9F3] transition"
        onClick={() => onOpen(d.date)}
      >
        <div className="shrink-0 w-11 text-center">
          <div className="text-[17px] font-extrabold num leading-none">{d.day}</div>
          <div className="text-[11px] font-semibold mt-0.5" style={{ color: d.weekday === 0 ? 'var(--red)' : d.weekday === 6 ? 'var(--sky)' : 'var(--muted)' }}>
            {dowKo(d.date)}
          </div>
        </div>

        <div className="grow min-w-0 hidden sm:block">
          <div className="text-[12.5px] font-semibold" style={{ color: 'var(--muted)' }}>
            {isToday ? '오늘' : dayTitle(d.date)}
          </div>
        </div>

        <div className="shrink-0"><span className={`badge ${st.cls}`}><span className="dot" />{st.label}</span></div>

        <div className="grow text-right num">
          <div className="font-extrabold text-[18px] leading-none" style={{ color: d.status === 'completed' ? 'var(--ink)' : 'var(--muted)' }}>
            {d.status === 'dayoff' ? '—' : krw(d.total)}
          </div>
          {d.status === 'completed' && d.completedAt && (
            <div className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--muted)' }}>{hhmm(d.completedAt)} 마감</div>
          )}
        </div>

        <div className="shrink-0 text-[15px] font-bold" style={{ color: 'var(--muted)' }}>›</div>
      </button>
    </div>
  );
}

export default function OwnerHistory({ user, onLogout }) {
  const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Seoul', hour12: false }).slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState('all');
  const [days, setDays] = useState(null);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    api(`/api/owner/history?month=${month}`)
      .then((d) => setDays(d.days))
      .catch((e) => setErr(e.message));
  }, [month]);

  useEffect(load, [load]);

  const filtered = useMemo(
    () => (days || []).filter((d) => filter === 'all' || d.status === filter),
    [days, filter]
  );

  const monthTotal = useMemo(
    () => (days || []).filter((d) => d.status === 'completed').reduce((a, d) => a + d.total, 0),
    [days]
  );
  const count = (k) => (days || []).filter((d) => d.status === k).length;

  return (
    <div className="min-h-full">
      <OwnerHeader user={user} onLogout={onLogout} dateLabel={monthLabel(month)} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-24 sm:pb-10 md:py-8 space-y-4">
        {/* 월 선택 */}
        <section className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              className="btn btn-ghost h-10 w-10 !p-0 text-[16px] font-extrabold"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label="이전 달"
            >‹</button>
            <div className="card px-5 h-10 grid place-items-center text-[16px] font-extrabold min-w-[110px] justify-center">
              {monthLabel(month)}
            </div>
            <button
              className="btn btn-ghost h-10 w-10 !p-0 text-[16px] font-extrabold"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="다음 달"
            >›</button>
          </div>

          {/* 요약 */}
          <div className="card px-4 py-2.5 flex items-center gap-4">
            <div>
              <div className="label">월 매출</div>
              <div className="num font-extrabold text-[18px] leading-none mt-1">{krw(monthTotal)}</div>
            </div>
            <div className="h-8 w-px" style={{ background: 'var(--line)' }} />
            <div>
              <div className="label">완료</div>
              <div className="num font-extrabold text-[18px] leading-none mt-1" style={{ color: 'var(--emerald)' }}>{count('completed')}일</div>
            </div>
            <div className="h-8 w-px" style={{ background: 'var(--line)' }} />
            <div>
              <div className="label">휴무</div>
              <div className="num font-extrabold text-[18px] leading-none mt-1" style={{ color: 'var(--sky)' }}>{count('dayoff')}일</div>
            </div>
          </div>
        </section>

        {/* 상태 필터 */}
        <section className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 h-9 rounded-full text-[13.5px] font-bold transition"
                style={active ? { background: 'var(--ink)', color: '#fff' } : { background: '#EDE9DF', color: 'var(--ink-soft)' }}
              >
                {f.label}{f.key !== 'all' ? ` ${count(f.key)}` : ''}
              </button>
            );
          })}
        </section>

        {err && (
          <div className="rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{err}</div>
        )}

        {/* 일별 목록 */}
        <section className="space-y-2">
          {!days ? (
            <div className="text-center py-10" style={{ color: 'var(--muted)' }}>불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div className="card py-10 text-center text-[14px] font-semibold" style={{ color: 'var(--muted)' }}>
              해당 상태의 날짜가 없어요
            </div>
          ) : (
            filtered.map((d) => (
              <DayRow
                key={d.date}
                d={d}
                todayDate={today}
                onOpen={(date) => navigate(`/settlement/${date}`)}
              />
            ))
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
