import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  { to: '/query', icon: MessageSquareText, label: 'Soru Sor' },
  { to: '/sources', icon: FileText, label: 'Kaynaklar' },
  { to: '/students', icon: Users, label: 'Öğrenciler' },
  { to: '/observations', icon: Eye, label: 'Gözlem Kayıt' },
  { to: '/materials', icon: Sparkles, label: 'Materyal Üretici' },
  { to: '/iep', icon: ClipboardList, label: 'BEP Üretici' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1><GraduationCap size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />EduRAG</h1>
        <span>Özel Eğitim Asistanı</span>
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
        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
