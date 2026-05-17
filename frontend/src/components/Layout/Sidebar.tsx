import { NavLink, useNavigate } from 'react-router-dom';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import {
  LayoutDashboard, MessageSquareText, FileText, Users, Eye, Sparkles, ClipboardList, Plus,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/iep', icon: ClipboardList, label: 'IEPs' },
  { to: '/query', icon: MessageSquareText, label: 'Chat' },
  { to: '/materials', icon: Sparkles, label: 'Materials' },
  { to: '/sources', icon: FileText, label: 'Sources' },
  { to: '/observations', icon: Eye, label: 'Observations' },
];

function BackendStatus() {
  const status = useBackendHealth(30_000);
  const config = {
    healthy:  { color: '#2D936C', label: 'API Online 200 OK' },
    offline:  { color: '#BA1A1A', label: 'API Offline' },
    checking: { color: '#FFD97D', label: 'Connecting…' },
  }[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', marginBottom: '12px' }}>
      <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px', flexShrink: 0 }}>
        {status !== 'offline' && (
          <span style={{
            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
            background: config.color, opacity: 0.4, animation: 'pulse 2s infinite',
          }} />
        )}
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color }} />
      </span>
      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: config.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {config.label}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/sensei-logo.png"
          alt="SENSEI Logo"
          style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }}
        />
        <div>
          <h1 className="font-headline-md font-bold text-primary" style={{ margin: 0, color: 'var(--color-primary)' }}>SENSEI</h1>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Special Education AI</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={20} />
            <span className="font-label-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <BackendStatus />
        <button
          className="btn-primary"
          onClick={() => navigate('/iep')}
          style={{ marginTop: '4px' }}
        >
          <Plus size={18} /> New IEP
        </button>
      </div>
    </aside>
  );
}
