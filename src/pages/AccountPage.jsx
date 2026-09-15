import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import OwnerHeader from '../components/OwnerHeader.jsx';
import BottomNav from '../components/BottomNav.jsx';

const ROLE_LABEL = { owner: '원장', manager: '매니저' };

function Field({ label, type, value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="label block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 rounded-xl border px-4 text-[16px] outline-none transition focus:ring-2"
        style={{ borderColor: 'var(--line)', background: '#FBFAF6' }}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function Alert({ msg }) {
  if (!msg) return null;
  const ok = msg.type === 'ok';
  return (
    <div
      className="rounded-xl px-4 py-3 text-[13.5px] font-semibold"
      style={{ background: ok ? 'var(--emerald-soft)' : 'var(--red-soft)', color: ok ? 'var(--emerald)' : 'var(--red)' }}
    >
      {msg.text}
    </div>
  );
}

function ProfileCard({ user }) {
  return (
    <section className="card p-6 sm:p-7 flex items-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl grid place-items-center font-extrabold text-[22px] shrink-0"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        {user.name ? user.name.slice(0, 1) : '?'}
      </div>
      <div className="grow min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-[18px]">{user.name}</span>
          <span className="badge !px-2.5 !py-1 !text-[12px]" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {ROLE_LABEL[user.role] || user.role}
          </span>
        </div>
        <div className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
          아이디 <span className="num font-bold">{user.username}</span>
        </div>
      </div>
    </section>
  );
}

function SelfChange({ user }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!cur) return setMsg({ type: 'err', text: '현재 비밀번호를 입력해 주세요.' });
    if (next.length < 4) return setMsg({ type: 'err', text: '새 비밀번호는 4자 이상이어야 해요.' });
    if (next !== confirm) return setMsg({ type: 'err', text: '새 비밀번호와 확인이 달라요.' });
    setBusy(true);
    try {
      await api('/api/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      setMsg({ type: 'ok', text: '비밀번호가 변경됐어요. 다음부터 새 비밀번호로 로그인하세요.' });
      setCur(''); setNext(''); setConfirm('');
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-6 sm:p-7">
      <h2 className="font-extrabold text-[16px]">비밀번호 변경</h2>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
        {user.name}님 계정의 비밀번호를 변경합니다.
      </p>

      <form className="mt-5 space-y-4" onSubmit={submit}>
        <Field
          label="현재 비밀번호"
          type="password"
          value={cur}
          onChange={setCur}
          placeholder="현재 비밀번호 입력"
          autoComplete="current-password"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="새 비밀번호"
            type="password"
            value={next}
            onChange={setNext}
            placeholder="4자 이상"
            autoComplete="new-password"
          />
          <Field
            label="새 비밀번호 확인"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="한 번 더 입력"
            autoComplete="new-password"
          />
        </div>

        <Alert msg={msg} />

        <button type="submit" disabled={busy} className="btn btn-primary h-[50px] w-full text-[15px]">
          {busy ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </section>
  );
}

function OwnerManage() {
  const [users, setUsers] = useState(null);
  const [resets, setResets] = useState({});
  const [messages, setMessages] = useState({});
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api('/api/users')
      .then((d) => setUsers(d.users))
      .catch(() => {});
  }, []);

  const others = (users || []).filter((u) => u.role !== 'owner');

  const reset = async (u) => {
    const next = (resets[u.id] || '').trim();
    if (next.length < 4) {
      setMessages((m) => ({ ...m, [u.id]: { ok: false, text: '4자 이상 입력해 주세요.' } }));
      return;
    }
    setBusyId(u.id);
    setMessages((m) => ({ ...m, [u.id]: null }));
    try {
      await api(`/api/users/${u.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: next }),
      });
      setResets((r) => ({ ...r, [u.id]: '' }));
      setMessages((m) => ({ ...m, [u.id]: { ok: true, text: `${u.name}님 비밀번호가 재설정됐어요.` } }));
    } catch (err) {
      setMessages((m) => ({ ...m, [u.id]: { ok: false, text: err.message } }));
    } finally {
      setBusyId(null);
    }
  };

  if (others.length === 0) return null;

  return (
    <section className="card p-6 sm:p-7">
      <h2 className="font-extrabold text-[16px]">매니저 계정 관리</h2>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
        매니저의 비밀번호를 재설정할 수 있어요. (로그인 계정: 아이디·이름)
      </p>

      <div className="mt-5 space-y-4">
        {others.map((u) => {
          const msg = messages[u.id];
          return (
            <div key={u.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-[15px]">{u.name}</span>
                <span className="badge !px-2.5 !py-1 !text-[12px]" style={{ background: 'var(--emerald-soft)', color: 'var(--emerald)' }}>
                  {ROLE_LABEL[u.role] || u.role}
                </span>
                <span className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                  아이디 <span className="num font-bold">{u.username}</span>
                </span>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="password"
                  className="sm:max-w-[260px] h-11 flex-1 rounded-xl border px-4 text-[15px] outline-none"
                  style={{ borderColor: 'var(--line)', background: '#FBFAF6' }}
                  placeholder="새 비밀번호 (4자 이상)"
                  value={resets[u.id] || ''}
                  onChange={(e) => setResets((r) => ({ ...r, [u.id]: e.target.value }))}
                  autoComplete="off"
                />
                <button
                  className="btn btn-primary h-11 px-5 text-[14px] shrink-0"
                  disabled={busyId === u.id}
                  onClick={() => reset(u)}
                >
                  {busyId === u.id ? '저장 중…' : '비밀번호 재설정'}
                </button>
              </div>

              {msg && <Alert msg={msg} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopBar({ user, onLogout }) {
  if (user.role === 'owner') {
    return <OwnerHeader user={user} onLogout={onLogout} dateLabel="계정 설정" />;
  }
  // 매니저용 간단 헤더
  return (
    <header className="sticky top-0 z-10" style={{ background: 'rgba(244,241,234,0.9)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl grid place-items-center text-[15px] shrink-0" style={{ background: 'var(--accent-soft)' }}>💇</span>
          <span className="font-extrabold text-[16px] tracking-tight">살롱 데일리</span>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/settlement" className="btn btn-ghost text-[13px] h-9 px-3.5 shrink-0">정산으로</Link>
          <span className="hidden sm:inline text-[13px] font-semibold truncate" style={{ color: 'var(--ink-soft)' }}>{user.name}</span>
          <button onClick={onLogout} className="btn btn-ghost text-[13px] h-9 px-3.5 shrink-0">로그아웃</button>
        </div>
      </div>
    </header>
  );
}

export default function AccountPage({ user, onLogout }) {
  return (
    <div className="min-h-full">
      <TopBar user={user} onLogout={onLogout} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-24 sm:pb-10 md:py-8 space-y-4">
        <h1 className="font-extrabold text-[22px] tracking-tight">계정 설정</h1>
        <ProfileCard user={user} />
        <SelfChange user={user} />
        {user.role === 'owner' && <OwnerManage />}
        <div className="pb-6" />
      </main>
      {user.role === 'owner' && <BottomNav />}
    </div>
  );
}
