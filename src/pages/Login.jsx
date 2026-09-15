import { useState } from 'react';
import { api } from '../api.js';

const DEMO = [
  { label: '원장님', username: 'owner', password: '1234', hint: '대시보드 확인' },
  { label: '매니저', username: 'manager', password: '1234', hint: '정산 작성' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const d = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(d.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quick = (u) => {
    setUsername(u);
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'var(--accent-soft)' }}>
            <span className="text-2xl">💇</span>
          </div>
          <h1 className="text-[26px] font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>살롱 데일리</h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>미용실 마감 정산을 한눈에</p>
        </div>

        <form onSubmit={submit} className="card p-6 sm:p-7">
          <div className="space-y-4">
            <div>
              <label className="label block mb-1.5">아이디</label>
              <input
                className="w-full h-12 rounded-xl border px-4 text-[16px] outline-none transition focus:ring-2"
                style={{ borderColor: 'var(--line)', background: 'var(--paper)', backgroundColor: '#FBFAF6' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="아이디 입력"
              />
            </div>
            <div>
              <label className="label block mb-1.5">비밀번호</label>
              <input
                type="password"
                className="w-full h-12 rounded-xl border px-4 text-[16px] outline-none transition focus:ring-2"
                style={{ borderColor: 'var(--line)', background: '#FBFAF6' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호 입력"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full h-[52px] mt-5 text-[16px]">
            {busy ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <div className="mt-5">
          <div className="label text-center mb-2.5">체험 계정으로 바로 시작</div>
          <div className="grid grid-cols-2 gap-3">
            {DEMO.map((d) => (
              <button key={d.username} type="button" onClick={() => quick(d.username)}
                className="card p-3.5 text-left hover:shadow-md transition cursor-pointer"
                style={{ background: '#FBFAF6' }}>
                <div className="font-extrabold text-[15px]" style={{ color: 'var(--ink)' }}>{d.label}</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  id <span className="num font-bold">{d.username}</span> · {d.hint}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
