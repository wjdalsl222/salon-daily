import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import OwnerHistory from './pages/OwnerHistory.jsx';
import OwnerStatistics from './pages/OwnerStatistics.jsx';
import SettlementDetail from './pages/SettlementDetail.jsx';
import AccountPage from './pages/AccountPage.jsx';
import ManagerSettlement from './pages/ManagerSettlement.jsx';

const homeFor = (user) => (user?.role === 'owner' ? '/' : '/settlement');

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>살롱 데일리</div>
        <div className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>불러오는 중…</div>
      </div>
    </div>
  );
}

// 기본 비밀번호(1234)로 로그인 중일 때 상단에 띄우는 안내 배너
function DefaultPwdBanner() {
  return (
    <div className="sticky top-0 z-30 w-full" style={{ background: 'var(--amber-soft)', borderBottom: '1px solid #EDDDB8' }}>
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-bold" style={{ color: 'var(--amber)' }}>
          아직 기본 비밀번호(1234)로 접속 중이에요. 사용 전에 꼭 변경해 주세요.
        </span>
        <Link to="/account" className="btn px-3 h-8 text-[12.5px] shrink-0" style={{ background: 'var(--amber)', color: '#fff' }}>
          비밀번호 변경
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    api('/api/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Splash />;

  const logout = async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    setUser(null);
  };

  return (
    <>
      {user && user.needsDefaultPassword && <DefaultPwdBanner />}
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={homeFor(user)} replace />
            ) : (
              <Login onLogin={setUser} />
            )
          }
        />
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace state={{ from: location }} />
            ) : user.role !== 'owner' ? (
              <Navigate to="/settlement" replace />
            ) : (
              <OwnerDashboard user={user} onLogout={logout} />
            )
          }
        />
        <Route
          path="/history"
          element={
            !user ? (
              <Navigate to="/login" replace state={{ from: location }} />
            ) : user.role !== 'owner' ? (
              <Navigate to="/" replace />
            ) : (
              <OwnerHistory user={user} onLogout={logout} />
            )
          }
        />
      <Route
        path="/statistics"
        element={
          !user ? (
            <Navigate to="/login" replace state={{ from: location }} />
          ) : user.role !== 'owner' ? (
            <Navigate to="/" replace />
          ) : (
            <OwnerStatistics user={user} onLogout={logout} />
          )
        }
      />
      <Route
        path="/settlement/:date"
          element={
            !user ? (
              <Navigate to="/login" replace state={{ from: location }} />
            ) : user.role !== 'owner' ? (
              <Navigate to="/" replace />
            ) : (
              <SettlementDetail user={user} onLogout={logout} />
            )
          }
        />
        <Route
          path="/account"
          element={
            !user ? (
              <Navigate to="/login" replace state={{ from: location }} />
            ) : (
              <AccountPage user={user} onLogout={logout} />
            )
          }
        />
        <Route
          path="/settlement"
          element={
            !user ? (
              <Navigate to="/login" replace state={{ from: location }} />
            ) : user.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <ManagerSettlement user={user} onLogout={logout} />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? homeFor(user) : '/login'} replace />} />
      </Routes>
    </>
  );
}
