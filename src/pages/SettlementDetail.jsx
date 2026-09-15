import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { PAYMENT_METHODS } from '../methods.js';
import { krw, hhmm } from '../format.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const STATUS_LABEL = { none: '미작성', draft: '작성 중', completed: '정산 완료', dayoff: '휴무' };
const STATUS_STYLE = {
  none: { background: '#EFECE4', color: '#6E6759' },
  draft: { background: 'var(--amber-soft)', color: 'var(--amber)' },
  completed: { background: 'var(--emerald-soft)', color: 'var(--emerald)' },
  dayoff: { background: 'var(--sky-soft)', color: 'var(--sky)' },
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

function Hero({ d }) {
  const st = d.status;
  const meta = d.completedAt
    ? `${hhmm(d.completedAt)} 마감 · ${d.managerName || '매니저'}님 작성`
    : d.managerName ? `${d.managerName}님 작성` : '';
  return (
    <section className="card p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => window.history.back()}
          className="btn btn-ghost h-9 px-3 text-[13px] shrink-0"
        >‹ 뒤로</button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-right min-w-0">
            <div className="num font-bold text-[14.5px] sm:text-[16px] truncate">{dayTitle(d.date)}</div>
            {meta && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>{meta}</div>}
          </div>
          <span className="badge shrink-0" style={STATUS_STYLE[st] || {}}>
            <span className="dot" />
            {STATUS_LABEL[st] || ''}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="label">총매출</div>
        <div className="mt-1.5 num font-extrabold leading-none tracking-tight text-[46px] min-[420px]:text-[54px] sm:text-[64px]">
          {st === 'dayoff' ? '—' : krw(d.total)}<span className="text-lg font-bold ml-1" style={{ color: 'var(--muted)' }}>원</span>
        </div>
      </div>
    </section>
  );
}

function Methods({ d }) {
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
    <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {PAYMENT_METHODS.map((m) => {
        const isCash = m.key === 'cash';
        return (
          <div key={m.key} className="rounded-2xl px-4 py-3" style={isCash ? { border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' } : { border: '1px solid var(--line)', background: '#FFFEFB' }}>
            <div className="label">{isCash ? '현금 매출' : m.label}</div>
            <div className="mt-1.5 num font-extrabold text-[20px] sm:text-[22px] tracking-tight leading-none">{krw(d.items[m.key])}</div>
          </div>
        );
      })}
    </section>
  );
}

function CashDiff({ d }) {
  if (d.status !== 'completed' && d.status !== 'draft') return null;
  return (
    <section className="card p-4 sm:p-5 flex items-center justify-between gap-3">
      <div>
        <div className="label">현금 차액 · 실제 보유 − 장부 현금</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
          {d.actualCash == null ? '현금 정보 없음' : `보유 ${krw(d.actualCash)} · 장부 ${krw(d.items.cash)}`}
        </div>
      </div>
      <div className="num font-extrabold text-[26px] tracking-tight" style={{ color: d.cashDiff == null ? 'var(--muted)' : (d.cashDiff < 0 ? 'var(--red)' : 'var(--emerald)') }}>
        {d.cashDiff == null ? '—' : (d.cashDiff < 0 ? '−' : '+') + krw(Math.abs(d.cashDiff)) + '원'}
      </div>
    </section>
  );
}

function Note({ d }) {
  if (d.status !== 'completed' && d.status !== 'draft') return null;
  return (
    <section className="card p-4" style={{ background: d.note ? 'var(--amber-soft)' : '#FBFAF6', borderColor: 'transparent' }}>
      <span className="label mr-2" style={{ color: 'var(--amber)' }}>특이사항</span>
      <span className="text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>
        {d.note ? d.note : '특이사항이 없어요'}
      </span>
    </section>
  );
}

function Timeline({ d }) {
  if (d.status === 'dayoff' || d.status === 'none') return null;
  const logs = d.editLogs || [];
  const hasModify = logs.some((l) => l.action === 'modify');
  return (
    <>
      <div className="flex items-center justify-between pt-1">
        <span className="label">정산 기록</span>
        {d.status === 'completed' && !hasModify && (
          <span className="text-[11.5px] font-semibold" style={{ color: 'var(--emerald)' }}>완료 후 수정 없음</span>
        )}
      </div>
      <section className="card p-4">
        {logs.length === 0 ? (
          <div className="py-4 text-center text-[14px] font-semibold" style={{ color: 'var(--muted)' }}>정산 기록이 없어요</div>
        ) : (
          <ol className="relative space-y-4">
            {logs.map((l, i) => {
              const isComplete = l.action === 'complete';
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
                    <div className="mt-1.5 text-[13.5px] font-semibold rounded-lg px-3 py-2"
                      style={isComplete
                        ? { background: 'var(--emerald-soft)', color: 'var(--emerald)' }
                        : { background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                      {l.changes}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
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
      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 pb-24 sm:pb-10 md:py-8 space-y-4">
        {err && (
          <div className="rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{err}</div>
        )}

        {!d ? (
          <div className="text-center py-10" style={{ color: 'var(--muted)' }}>불러오는 중…</div>
        ) : (
          <>
            <Hero d={d} />

            <div className="label pt-1">결제수단별 금액</div>
            <Methods d={d} />
            <CashDiff d={d} />
            <Note d={d} />
            <Timeline d={d} />
          </>
        )}

        <div className="pt-2">
          <Link to={`/history?month=${d ? d.monthKey : ''}`} className="btn btn-ghost h-11 px-4 text-[14px]">
            과거 정산 목록으로
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
