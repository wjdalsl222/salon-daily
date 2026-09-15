import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { PAYMENT_METHODS } from '../methods.js';
import { krw, hhmm, formatDateKor } from '../format.js';

function MoneyInput({ value, onChange, readOnly }) {
  const display = value === '' || value == null ? '' : Number(value).toLocaleString('ko-KR');
  return (
    <div className={`amount-box ${readOnly ? 'readonly' : ''}`}>
      <input
        inputMode="numeric"
        value={display}
        readOnly={readOnly}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(digits === '' ? '' : Number(digits));
        }}
        className="amount-input w-full"
        placeholder="0"
        autoComplete="off"
      />
      <span className="amount-unit">원</span>
    </div>
  );
}

function SaveIndicator({ state, savedAt, editing }) {
  if (!editing) return null;
  const map = {
    idle:   { c: 'var(--muted)',  t: '입력 내용은 자동으로 저장돼요' },
    saving: { c: 'var(--amber)',   t: '저장 중…' },
    saved:  { c: 'var(--emerald)', t: `자동 저장됨${savedAt ? ' · ' + hhmm(savedAt) : ''}` },
    error:  { c: 'var(--red)',     t: '저장에 실패했어요. 다시 시도해 주세요.' },
  };
  const m = map[state] || map.idle;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: m.c }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.c }} />
      {m.t}
    </span>
  );
}

function Banner({ d, editing, onEdit, onDayoff, onUnDayoff, busy }) {
  if (d.status === 'dayoff') {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>
        <div className="font-extrabold text-[15px]">오늘은 휴무로 등록되어 있어요</div>
        <button className="btn btn-ghost text-[13px] h-9 px-4" disabled={busy} onClick={onUnDayoff}>휴무 취소</button>
      </div>
    );
  }
  if (d.status === 'completed') {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--emerald-soft)', color: 'var(--emerald)' }}>
        <div className="font-extrabold text-[15px]">
          {editing ? '수정 중 · 변경 내용은 자동으로 기록돼요' : `오늘 정산이 완료됐어요 · ${hhmm(d.completedAt)} 마감`}
        </div>
        {!editing && (
          <button className="btn text-[13px] h-9 px-4" style={{ background: 'var(--emerald)', color: '#fff' }} onClick={onEdit}>수정하기</button>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
      <div className="font-extrabold text-[15px]">오늘 정산을 입력해 주세요</div>
      <div className="text-[12.5px] font-semibold">금액 입력은 즉시 원장님 화면에 반영돼요</div>
    </div>
  );
}

// 지폐·동전 단위 (현금 계산 도우미)
const BILL_UNITS = [
  { label: '5만원', value: 50000, unit: '장' },
  { label: '1만원', value: 10000, unit: '장' },
  { label: '5천원', value: 5000, unit: '장' },
  { label: '1천원', value: 1000, unit: '장' },
  { label: '500원', value: 500, unit: '개' },
  { label: '100원', value: 100, unit: '개' },
  { label: '50원', value: 50, unit: '개' },
  { label: '10원', value: 10, unit: '개' },
];

function CashCounter({ disabled, onUse }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const sum = BILL_UNITS.reduce((a, u) => a + (Number(counts[u.value]) || 0) * u.value, 0);
  const setCount = (v, val) => setCounts((p) => ({ ...p, [v]: val === '' ? '' : Number(val) }));
  if (disabled) return null;
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-ghost h-9 px-3 text-[13px]">
        {open ? '지폐·동전 계산 닫기' : '지폐·동전 개수로 계산하기'}
      </button>
      {open && (
        <div className="mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BILL_UNITS.map((u) => {
              const c = Number(counts[u.value]) || 0;
              const sub = c * u.value;
              return (
                <div key={u.value} className="rounded-xl px-3 py-2 flex items-center justify-between gap-1" style={{ background: '#F7F4EC' }}>
                  <span className="text-[12.5px] font-bold shrink-0" style={{ color: 'var(--ink-soft)' }}>{u.label}</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      inputMode="numeric"
                      value={c === 0 ? '' : c}
                      onChange={(e) => setCount(u.value, e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="0"
                      className="w-11 h-8 rounded-lg bg-white text-center font-extrabold num outline-none border"
                      style={{ borderColor: 'var(--line)' }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{u.unit}</span>
                  </div>
                  <span className="num text-[12px] font-bold w-14 text-right shrink-0" style={{ color: 'var(--muted)' }}>{sub ? krw(sub) : ''}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="label">계산 합계</div>
            <div className="flex items-center gap-3">
              <span className="num font-extrabold text-[22px]">{krw(sum)}<span className="text-sm ml-0.5" style={{ color: 'var(--muted)' }}>원</span></span>
              <button className="btn btn-primary h-10 px-4 text-[14px]" disabled={sum <= 0}
                onClick={() => { onUse(sum); setOpen(false); }}>
                이 금액 사용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({ open, total, items, diff, note, busy, onClose, onConfirm }) {
  if (!open) return null;
  const rows = PAYMENT_METHODS.filter((m) => (Number(items[m.key]) || 0) > 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(38,34,32,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md card p-6 rounded-b-none sm:rounded-b-[22px]" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-extrabold text-[19px]">정산을 완료할까요?</h2>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
          원장님 화면에 '정산 완료'로 표시돼요. 이후 수정은 기록으로 남습니다.
        </p>

        <div className="mt-4 space-y-2">
          {rows.map((m) => (
            <div key={m.key} className="flex items-center justify-between">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--ink-soft)' }}>{m.label}</span>
              <span className="num text-[15px] font-extrabold">{krw(items[m.key])}원</span>
            </div>
          ))}
          <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--line)' }}>
            <span className="text-[15px] font-extrabold">총매출</span>
            <span className="num text-[22px] font-extrabold">{krw(total)}원</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink-soft)' }}>현금 차액</span>
            <span className="num text-[15px] font-extrabold" style={{ color: diff == null ? 'var(--muted)' : (diff < 0 ? 'var(--red)' : 'var(--emerald)') }}>
              {diff == null ? '—' : (diff < 0 ? '−' : '+') + krw(Math.abs(diff)) + '원'}
            </span>
          </div>
        </div>

        {note && (
          <div className="mt-3 rounded-xl px-3 py-2 text-[13px]" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            특이사항 · {note}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn btn-ghost h-12 text-[15px]" onClick={onClose} disabled={busy}>취소</button>
          <button className="btn btn-primary h-12 text-[15px]" onClick={onConfirm} disabled={busy}>
            {busy ? '처리 중…' : '완료 확정'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerSettlement({ user, onLogout }) {
  const [d, setD] = useState(null);
  const [items, setItems] = useState({});
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [modify, setModify] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [savedAt, setSavedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lastSavedRef = useRef('');

  const editing = d && (d.status !== 'completed' || modify);

  useEffect(() => {
    api('/api/manager/today')
      .then((x) => {
        setD(x);
        setItems(x.items);
        setActualCash(x.actualCash == null ? '' : x.actualCash);
        setNote(x.note || '');
      })
      .catch((e) => setErr(e.message));
  }, []);

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (!editing) return;
    const serial = JSON.stringify({ items, actualCash, note });
    if (serial === lastSavedRef.current) return;
    const t = setTimeout(() => {
      lastSavedRef.current = serial;
      setSaveState('saving');
      api('/api/manager/today', {
        method: 'PUT',
        body: JSON.stringify({
          items,
          actualCash: actualCash === '' ? null : Number(actualCash),
          note,
        }),
      })
        .then((x) => { setD(x); setSaveState('saved'); setSavedAt(x.updated_at); })
        .catch(() => { lastSavedRef.current = ''; setSaveState('error'); });
    }, 700);
    return () => clearTimeout(t);
  }, [items, actualCash, note, editing]);

  const total = PAYMENT_METHODS.reduce((a, m) => a + (Number(items[m.key]) || 0), 0);
  const cashAmount = Number(items.cash) || 0;
  const diff = actualCash === '' ? null : Number(actualCash) - cashAmount;

  const complete = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      lastSavedRef.current = JSON.stringify({ items, actualCash, note });
      const x = await api('/api/manager/today/complete', {
        method: 'POST',
        body: JSON.stringify({ items, actualCash: actualCash === '' ? null : Number(actualCash), note }),
      });
      setD(x); setModify(false); setSaveState('saved'); setSavedAt(x.updated_at);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const dayoff = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try { setD(await api('/api/manager/today/dayoff', { method: 'POST', body: JSON.stringify({}) })); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const undayoff = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try { setD(await api('/api/manager/today/undayooff', { method: 'POST' })); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (!d) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        {err || '불러오는 중…'}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10" style={{ background: 'rgba(244,241,234,0.9)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl grid place-items-center text-[15px]" style={{ background: 'var(--accent-soft)' }}>💇</span>
            <span className="font-extrabold text-[16px] tracking-tight">살롱 데일리</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="hidden sm:inline text-[13px] font-semibold" style={{ color: 'var(--ink-soft)' }}>{formatDateKor(d.date)} · {user.name}</span>
            <span className="sm:hidden text-[13px] font-semibold" style={{ color: 'var(--ink-soft)' }}>{user.name}</span>
            <Link to="/account" className="btn btn-ghost text-[13px] h-9 px-2.5 sm:px-3.5">계정</Link>
            <button onClick={onLogout} className="btn btn-ghost text-[13px] h-9 px-3 shrink-0">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-10 space-y-4">
        {/* 오늘 날짜 + 상태 — 한눈에 */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl grid place-items-center text-[15px]" style={{ background: 'var(--accent-soft)' }}>📅</span>
            <div className="min-w-0">
              <div className="label">오늘 날짜</div>
              <div className="num font-extrabold text-[22px] sm:text-[24px] leading-none mt-0.5">{formatDateKor(d.date)}</div>
            </div>
          </div>
          <span
            className="badge"
            style={({
              none: { background: '#EFECE4', color: '#6E6759' },
              draft: { background: 'var(--amber-soft)', color: 'var(--amber)' },
              completed: { background: 'var(--emerald-soft)', color: 'var(--emerald)' },
              dayoff: { background: 'var(--sky-soft)', color: 'var(--sky)' },
            })[d.status] || {}}
          >
            <span className="dot" />
            {({ none: '미작성', draft: '작성 중', completed: '정산 완료', dayoff: '휴무' })[d.status] || ''}
          </span>
        </header>

        <Banner
          d={d} editing={editing} busy={busy}
          onEdit={() => setModify(true)}
          onDayoff={dayoff} onUnDayoff={undayoff}
        />

        {err && (
          <div className="rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{err}</div>
        )}

        {d.status !== 'dayoff' && (
          <>
            {/* 총매출 */}
            <section className="card p-6 sm:p-8 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="label">총매출</div>
                <div className="mt-2 num font-extrabold text-[42px] sm:text-[54px] leading-none tracking-tight">
                  {krw(total)}<span className="text-lg ml-1" style={{ color: 'var(--muted)' }}>원</span>
                </div>
              </div>
              <SaveIndicator state={saveState} savedAt={savedAt} editing={editing} />
            </section>

            {/* 결제수단 입력 */}
            <section className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <div key={m.key} className="card p-4 sm:p-5">
                  <div className="label mb-0.5">{m.label}</div>
                  <MoneyInput value={items[m.key]} readOnly={!editing} onChange={(v) => setItems((p) => ({ ...p, [m.key]: v }))} />
                </div>
              ))}
            </section>

            {/* 현금 실제 보유액 */}
            <section className="card p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="label">현금 실제 보유액</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
                    금고에 실제로 있는 현금을 입력하세요
                  </div>
                </div>
                <div className="w-40"><MoneyInput value={actualCash} readOnly={!editing} onChange={setActualCash} /></div>
              </div>
              <CashCounter disabled={!editing} onUse={(sum) => setActualCash(sum)} />
              <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--line)' }}>
                <div className="label">차액 · 실제 보유 − 현금 매출</div>
                <div className="num font-extrabold text-[22px] tracking-tight" style={{ color: diff == null ? 'var(--muted)' : (diff < 0 ? 'var(--red)' : 'var(--emerald)') }}>
                  {diff == null ? '—' : (diff < 0 ? '−' : '+') + krw(Math.abs(diff)) + '원'}
                </div>
              </div>
            </section>

            {/* 특이사항 */}
            <section className="card p-5 sm:p-6">
              <label className="label block mb-2">특이사항 (선택)</label>
              <textarea
                rows={2}
                readOnly={!editing}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예) 네이버페이 결제 오류 1건, 시술 취소 1건"
                className="w-full rounded-xl border px-4 py-3 text-[15px] outline-none resize-none focus:ring-2"
                style={{ borderColor: 'var(--line)', background: '#FBFAF6' }}
              />
            </section>

            {/* 완료 버튼 */}
            <div className="pt-1" style={{ paddingBottom: 'max(6rem, env(safe-area-inset-bottom))' }}>
              {d.status !== 'completed' && editing ? (
                <button className="btn btn-primary w-full h-[56px] text-[17px]" disabled={busy} onClick={() => setConfirmOpen(true)}>
                  정산 완료
                </button>
              ) : editing ? (
                <button className="btn btn-primary w-full h-[56px] text-[17px]" disabled={busy} onClick={complete}>
                  수정 저장
                </button>
              ) : (
                <div className="card p-4 text-center text-[13.5px] font-semibold" style={{ color: 'var(--muted)', background: 'var(--emerald-soft)', borderColor: 'transparent' }}>
                  오늘 정산이 완료되었습니다 · {hhmm(d.completedAt)}
                </div>
              )}
              {d.status !== 'completed' && (
                <button
                  className="w-full mt-3 text-center text-[13px] font-semibold cursor-pointer hover:opacity-70 transition"
                  style={{ color: 'var(--muted)' }}
                  onClick={dayoff}
                  disabled={busy}
                >
                  오늘 휴무로 등록
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        total={total}
        items={items}
        diff={diff}
        note={note}
        busy={busy}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => { await complete(); setConfirmOpen(false); }}
      />
    </div>
  );
}
