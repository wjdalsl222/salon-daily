import { useState } from 'react';
import { api } from '../api.js';

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

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* ── 히어로: 브랜드 ── */}
        <section className="card p-6 sm:p-7 text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'var(--accent-soft)' }}>
            <span className="text-2xl">💇</span>
          </div>
          <div className="label">미용실 마감 정산</div>
          <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>살롱 데일리</h1>
          <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--ink-soft)' }}>
            매니저는 1분 안에, 원장님은 3초 안에 확인하세요.
          </p>
        </section>

        {/* ── 섹션 라벨 + 로그인 카드 ── */}
        <div className="label px-1 pb-2">계정으로 로그인</div>
        <form onSubmit={submit} className="card p-6 sm:p-7">
          <div className="space-y-4">
            <div>
              <label className="label block mb-1.5">아이디</label>
              <input
                className="w-full h-12 rounded-xl border px-4 text-[16px] outline-none transition focus:ring-2"
                style={{ borderColor: 'var(--line)', background: '#FBFAF6' }}
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
      </div>
    </div>
  );
}
