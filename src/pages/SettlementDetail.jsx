import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { PAYMENT_METHODS } from '../methods.js';
import { krw, hhmm } from '../format.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const STATUS = {
  none:      { label: '미작성', cls: 'badge-none' },
  draft:     { label: '작성 중', cls: 'badge-draft' },
  completed: { label: '정산 완료', cls: 'badge-completed' },
  dayoff:    { label: '휴무', cls: 'badge-dayoff' },
};

const dayTitle = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 ${['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]}요일`;
};

const fmtStamp = (s) => {
  if (!s) return '';
  const num = s.replace(/[^\d]/g, '');
  let stamp;
  if (num.length >= 14) {
    stamp = new Date(
      Number(num.slice(0, 4)), Number(num.slice(4, 6)) - 1, Number(num.slice(6, 8)),
      Number(num.slice(8, 10)), Number(num.slice(10, 12)), Number(num.slice(12, 14))
    );
  } else {
    stamp = new Date(String(s).replace(' ', 'T'));
  }
  if (isNaN(stamp)) return s;
  const pad = (n) => String(n).padStart(2, '0');
  return `${stamp.getFullYear()}.${pad(stamp.getMonth() + 1)}.${pad(stamp.getDate())} ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}`;
};

function Summary({ d }) {
  const st = STATUS[d.status] || STATUS.none;
  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="btn btn-ghost h-9 px-3 text-[13px]"
          >‹ 뒤로</button>
          <h1 className="font-extrabold text-[18px] sm:text-[20px]">{dayTitle(d.date)}</h1>
          <span className={`badge ${st.cls}`}><span className="dot" />{st.label}</span>
        </div>
        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {d.completedAt ? `${hhmm(d.completedAt)} 마감 · ${d.managerName || '매니저'}님 작성` : (d.managerName ? `${d.managerName}님 작성` : '')}
        </div>
      </div>

      <div className="mt-6">
        <div className="label">총매출</div>
        <div className="mt-2 num font-extrabold text-[44px] sm:text-[56px] leading-none tracking-tight">
          {d.status === 'dayoff' ? '—' : krw(d.total)}<span className="text-lg ml-1" style={{ color: 'var(--muted)' }}>원</span>
        </div>
      </div>
    </section>
  );
}

function MethodsCard({ d }) {
  if (d.status === 'dayoff') {
    return (
      <section className="card p-6 text-center">
        <div className="text-[15px] font-bold" style={{ color: 'var(--sky)' }}>휴무일이에요 · 매출 없음</div>
      </section>
    );
  }
  if (d.status === 'none') {
    return (
      <section className="card p-6 text-center">
        <div className="text-[15px] font-bold" style={{ color: 'var(--muted)' }}>정산이 작성되지 않은 날이에요</div>
      </section>
    );
  }
  return (
    <section className="card p-5 sm:p-6">
      <div className="label mb-3">결제수단별 금액</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <div key={m.key} className="rounded-xl px-3 py-3 flex items-center justify-between" style={{ background: '#F7F4EC' }}>
            <span className="text-[13px] font-bold" style={{ color: 'var(--ink-soft)' }}>{m.label}</span>
            <span className="num text-[16px] font-extrabold">{krw(d.items[m.key])}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--line)' }}>
        <div>
          <div className="label">현금 차액 · 실제 보유액 − 장부 현금</div>
          <div className="mt-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {d.actualCash == null ? '현금 정보 없음' : `실제 보유 ${krw(d.actualCash)}원 · 장부 현금 ${krw(d.items.cash)}원`}
          </div>
        </div>
        <div className="num font-extrabold text-[24px] tracking-tight" style={{ color: d.cashDiff == null ? 'var(--muted)' : (d.cashDiff < 0 ? 'var(--red)' : 'var(--emerald)') }}>
          {d.cashDiff == null ? '—' : (d.cashDiff < 0 ? '−' : '+') + krw(Math.abs(d.cashDiff)) + '원'}
        </div>
      </div>
    </section>
  );
}

function NoteCard({ d }) {
  if (d.status !== 'completed' && d.status !== 'draft') return null;
  return (
    <section className="card p-5 sm:p-6">
      <div className="label">특이사항</div>
      {d.note ? (
        <p className="mt-2 text-[15px] font-medium leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{d.note}</p>
      ) : (
        <p className="mt-2 text-[14px]" style={{ color: 'var(--muted)' }}>특이사항이 없어요</p>
      )}
    </section>
  );
}

function Timeline({ d }) {
  if (d.status === 'dayoff' || d.status === 'none') return null;
  const logs = d.editLogs || [];
  const hasModify = logs.some((l) => l.action === 'modify');
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="label !text-[14px]">정산 기록</h2>
        {d.status === 'completed' && !hasModify && (
          <span className="text-[12.5px] font-semibold" style={{ color: 'var(--emerald)' }}>완료 후 수정 없음 · 변경 내용 없음</span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="mt-4 rounded-xl px-4 py-5 text-center text-[14px] font-semibold" style={{ color: 'var(--muted)' }}>
          정산 기록이 없어요
        </div>
      ) : (
        <ol className="mt-4 relative space-y-4">
          {logs.map((l, i) => {
            const isComplete = l.action === 'complete';
            const isFirst = i === 0;
            const isLast = i === logs.length - 1;
            return (
              <li key={l.id} className="relative pl-8">
                {!isLast && (
                  <span className="absolute left-[9px] top-6 bottom-[-16px] w-px" style={{ background: 'var(--line)' }} />
                )}
                <span
                  className="absolute left-0 top-[3px] w-[19px] h-[19px] rounded-full border-2 grid place-items-center"
                  style={{ borderColor: isComplete ? 'var(--emerald)' : 'var(--amber)', background: 'var(--surface)' }}
                >
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: isComplete ? 'var(--emerald)' : 'var(--amber)' }} />
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge !py-1 !px-2.5 !text-[12px] font-extrabold"
                    style={isComplete
                      ? { background: 'var(--emerald-soft)', color: 'var(--emerald)' }
                      : { background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                    {isComplete ? '정산 완료' : '수정'}
                  </span>
                  <span className="text-[12.5px] font-bold" style={{ color: 'var(--ink-soft)' }}>{l.editor || '—'}</span>
                  <span className="text-[12px] num" style={{ color: 'var(--muted)' }}>{fmtStamp(l.created_at)}</span>
                </div>

                {l.changes && (
                  <div
                    className="mt-1.5 text-[13.5px] font-semibold rounded-lg px-3 py-2"
                    style={isComplete
                      ? { background: 'var(--emerald-soft)', color: 'var(--emerald)' }
                      : { background: 'var(--amber-soft)', color: 'var(--amber)' }}
                  >
                    {l.changes}
                  </div>
                )}
                {isFirst && isComplete && <div className="sr-only">첫 기록: 정산 완료</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function SettlementDetail({ user, onLogout }) {
  const { date } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api(`/api/owner/settlement/${date}`)
      .then(setD)
      .catch((e) => setErr(e.message));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-full">
      <OwnerHeader user={user} onLogout={onLogout} dateLabel={d ? dayTitle(d.date) : ''} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-24 sm:pb-10 md:py-8 space-y-4">
        {err && (
          <div className="rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{err}</div>
        )}

        {!d ? (
          <div className="text-center py-10" style={{ color: 'var(--muted)' }}>불러오는 중…</div>
        ) : (
          <>
            <Summary d={d} />
            <MethodsCard d={d} />
            <NoteCard d={d} />
            <Timeline d={d} />
          </>
        )}

        <div className="pb-6">
          <Link to={`/history?month=${d ? d.monthKey : ''}`} className="btn btn-ghost h-11 px-4 text-[14px]">
            과거 정산 목록으로
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
