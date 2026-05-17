/* ============================================
 * SENSEI TopBar — Global Search + Profile Menu
 * Production-grade: real search, real auth, icon actions
 * ============================================ */

import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface StudentResult {
  id: string;
  name: string;
  disability_type: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia',
  otizm: 'Autism Spectrum Disorder',
  zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment',
  bedensel: 'Physical Disability',
  dehb: 'ADHD',
};

const INITIALS = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export default function TopBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [allStudents, setAllStudents] = useState<StudentResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Profile menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem('sensei_avatar'));

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load teacher profile & students on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    // Teacher name
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.full_name) setTeacherName(d.full_name); })
      .catch(() => {});
    // Students for search
    fetch(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.items) setAllStudents(d.items); })
      .catch(() => {});
  }, []);

  // Live filter
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      allStudents.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (DISABILITY_LABELS[s.disability_type] ?? s.disability_type).toLowerCase().includes(q)
      ).slice(0, 6)
    );
  }, [query, allStudents]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for avatar updates from Profile page
  useEffect(() => {
    const onAvatarUpdate = () => setAvatarUrl(localStorage.getItem('sensei_avatar'));
    window.addEventListener('avatar-updated', onAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', onAvatarUpdate);
  }, []);

  const handleSelect = (student: StudentResult) => {
    setQuery(''); setSearchFocused(false);
    navigate(`/student/${student.id}`);
  };

  const showDropdown = searchFocused && query.trim().length > 0;

  return (
    <header className="topbar">
      {/* Global Search */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', maxWidth: '480px' }}>
        <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={16} style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search students, goals..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              style={{ flex: 1, minWidth: 0 }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 999,
              background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
              borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}>
              {results.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No students found for "{query}"
                </div>
              ) : (
                <>
                  <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>
                    Students
                  </div>
                  {results.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-accent-peach)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {INITIALS(s.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{DISABILITY_LABELS[s.disability_type] ?? s.disability_type}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Notifications Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '10px', display: 'flex', position: 'relative', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Bell size={20} />
          </button>
          {notifOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '300px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                Notifications <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>All caught up!</span>
              </div>
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                🔔 No new notifications
              </div>
            </div>
          )}
        </div>

        {/* Settings Icon */}
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '10px', display: 'flex', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <div style={{ height: '28px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Avatar + Profile Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 4px', borderRadius: '40px', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--color-primary), #FF8C5A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
              overflow: 'hidden',
              border: avatarUrl ? '2px solid var(--color-primary)' : 'none',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (teacherName ? INITIALS(teacherName) : 'OP')
              }
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden' }}>
              {/* Teacher info */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{teacherName || 'Teacher'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Special Ed. Teacher</div>
              </div>
              {/* Menu items */}
              {[
                { icon: User, label: 'Profile', path: '/profile' },
                { icon: Settings, label: 'Settings', path: '/settings' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setMenuOpen(false); navigate(item.path); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, transition: 'background 0.12s', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <item.icon size={15} style={{ color: 'var(--color-primary)' }} />
                  {item.label}
                </button>
              ))}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '14px', fontWeight: 600, transition: 'background 0.12s', textAlign: 'left', marginBottom: '4px' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
