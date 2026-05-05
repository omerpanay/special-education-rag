import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Layout/Sidebar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Query from './pages/Query';
import Sources from './pages/Sources';
import Students from './pages/Students';
import IEPGenerator from './pages/IEPGenerator';
import StudentDashboard from './pages/StudentDashboard';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
