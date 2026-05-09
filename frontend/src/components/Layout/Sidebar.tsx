import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Users,
  LogOut,
  GraduationCap,
  ClipboardList,
  Eye,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/query', icon: MessageSquareText, label: 'Ask Question' },
  { to: '/sources', icon: FileText, label: 'Sources' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/observations', icon: Eye, label: 'Observations' },
  { to: '/materials', icon: Sparkles, label: 'Materials' },
  { to: '/iep', icon: ClipboardList, label: 'IEP Generator' },
];

function BackendStatus() {
  const status = useBackendHealth(30_000);

  const config = {
    healthy:  { color: '#81B29A', label: 'API online',   pulse: true  },
    offline:  { color: '#E07A5F', label: 'API offline',  pulse: false },
    checking: { color: '#E8A838', label: 'Connecting…',  pulse: true  },
  }[status];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-subtle)',
      marginBottom: 10,
    }}>
      {/* animated dot */}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10 }}>
        {config.pulse && (
          <span style={{
            position: 'absolute', width: '100%', height: '100%',
            borderRadius: '50%', background: config.color,
            opacity: 0.4,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        )}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: config.color, flexShrink: 0,
        }} />
      </span>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {config.label}
      </span>
      <span style={{
        marginLeft: 'auto', fontSize: '0.6rem',
        padding: '1px 6px', borderRadius: 4,
        background: config.color + '20',
        color: config.color, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {status === 'healthy' ? '200 OK' : status === 'offline' ? 'DOWN' : '…'}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1><GraduationCap size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />EduRAG</h1>
        <span>Special Education Assistant</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <BackendStatus />
        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
