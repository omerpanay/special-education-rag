import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Layout/Sidebar';
import ScrollToTop from './components/ScrollToTop';
import { useBackendHealth } from './hooks/useBackendHealth';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import TopBar from './components/Layout/TopBar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Query from './pages/Query';
import Sources from './pages/Sources';
import Students from './pages/Students';
import IEPGenerator from './pages/IEPGenerator';
import StudentDashboard from './pages/StudentDashboard';
import Observations from './pages/Observations';
import Materials from './pages/Materials';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function OfflineBanner() {
  const status = useBackendHealth(30_000);
  const [dismissed, setDismissed] = useState(false);

  if (status !== 'offline' || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(224,122,95,0.95)',
      backdropFilter: 'blur(8px)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: '0.88rem', fontWeight: 600, color: '#fff',
      boxShadow: '0 2px 16px rgba(224,122,95,0.4)',
      animation: 'slideDown 0.3s ease',
    }}>
      <AlertTriangle size={16} />
      Backend is offline — make sure the FastAPI server is running on port 8000
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#fff', opacity: 0.8, marginLeft: 8, padding: 2,
          display: 'flex', alignItems: 'center',
        }}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function AppLayout() {
  return (
    <>
      <OfflineBanner />
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <Outlet />
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/query" element={<Query />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/students" element={<Students />} />
            <Route path="/student/:studentId" element={<StudentDashboard />} />
            <Route path="/iep" element={<IEPGenerator />} />
            <Route path="/observations" element={<Observations />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
