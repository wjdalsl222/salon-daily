import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import OwnerHistory from './pages/OwnerHistory.jsx';
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

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('quick');
    const done = () => setLoading(false);
    if (q === 'owner' || q === 'manager') {
      // 체험용 빠른 로그인 (?quick=owner|manager) — 운영 시 제거
      api('/api/login', { method: 'POST', body: JSON.stringify({ username: q, password: '1234' }) })
        .then((d) => setUser(d.user))
        .catch(() => setUser(null))
        .finally(done);
      return;
    }
    api('/api/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(done);
  }, [location.search]);

  if (loading) return <Splash />;

  const logout = async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    setUser(null);
  };

  return (
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
  );
}
