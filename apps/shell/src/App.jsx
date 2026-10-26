import React, { Suspense, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Login from './Login.jsx';
import RemoteBoundary from './RemoteBoundary.jsx';

const Incidents = React.lazy(() => import('incidents/App'));
const Requests = React.lazy(() => import('requests/App'));
const Assets = React.lazy(() => import('assets/App'));

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('itsm_user') || 'null'));

  const logout = () => {
    localStorage.removeItem('itsm_token');
    localStorage.removeItem('itsm_user');
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
        <strong>ITSM Platform</strong>
        <nav style={{ display: 'flex', gap: 12, flex: 1 }}>
          <Link to="/incidents">Incidents</Link>
          <Link to="/requests">Requests</Link>
          <Link to="/assets">Assets</Link>
        </nav>
        <span>{user.name} ({user.role})</span>
        <button onClick={logout}>Log out</button>
      </header>
      <main>
        <Suspense fallback={<p>Loading…</p>}>
          <Routes>
            <Route path="/" element={<Navigate to="/incidents" replace />} />
            <Route path="/incidents" element={<RemoteBoundary name="Incidents"><Incidents /></RemoteBoundary>} />
            <Route path="/requests" element={<RemoteBoundary name="Requests"><Requests /></RemoteBoundary>} />
            <Route path="/assets" element={<RemoteBoundary name="Assets"><Assets /></RemoteBoundary>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
