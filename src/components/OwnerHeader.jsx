import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/', label: '대시보드' },
  { to: '/history', label: '과거 정산' },
  { to: '/account', label: '계정' },
];

export default function OwnerHeader({ user, onLogout, dateLabel }) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-10" style={{ background: 'rgba(244,241,234,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl grid place-items-center text-[15px] shrink-0" style={{ background: 'var(--accent-soft)' }}>💇</span>
          <span className="font-extrabold text-[16px] tracking-tight hidden sm:inline">살롱 데일리</span>
        </div>

        {/* 데스크톱 탭 */}
        <nav className="hidden md:flex items-center gap-1 bg-white/60 rounded-full p-1 border" style={{ borderColor: 'var(--line)' }}>
          {TABS.map((t) => {
            const active = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="px-3.5 h-8 rounded-full grid place-items-center text-[13.5px] font-bold transition"
                style={active ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--ink-soft)' }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden md:inline text-[13px] font-semibold truncate" style={{ color: 'var(--ink-soft)' }}>
            {dateLabel} · {user.name}
          </span>
          <button onClick={onLogout} className="btn btn-ghost text-[13px] h-9 px-3 shrink-0">로그아웃</button>
        </div>
      </div>
    </header>
  );
}
