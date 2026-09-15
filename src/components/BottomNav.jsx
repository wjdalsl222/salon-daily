import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/', label: '대시보드', icon: '🏠' },
  { to: '/history', label: '과거 정산', icon: '📅' },
  { to: '/statistics', label: '통계', icon: '📊' },
  { to: '/account', label: '계정', icon: '⚙️' },
];

// 문서 흐름(flow) 안의 스티키 바닥 탭.
// position:fixed가 웹뷰/캡처 환경에서 뜨는 문제를 피하기 위해
// 페이지 맨 끝에 배치해 뷰포트 하단에 붙도록 함 (어떤 환경에서도 내용 위로 뜨지 않음).
export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="md:hidden"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 40,
        background: '#FFFEFB',
        borderTop: '1px solid var(--line)',
        boxShadow: '0 -2px 12px rgba(38,34,32,0.05)',
      }}
    >
      <div className="grid grid-cols-4 h-[60px]">
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center justify-center gap-1 transition"
              style={active ? { color: 'var(--accent)' } : { color: 'var(--muted)' }}
            >
              <span className="text-[18px] leading-none">{t.icon}</span>
              <span className="text-[11px] font-bold leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
