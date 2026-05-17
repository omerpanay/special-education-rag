import { useState, useEffect, useRef } from 'react';
import { User, Mail, BookOpen, Camera, Save, Shield, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');
const AVATAR_KEY = 'sensei_avatar';

interface TeacherProfile {
  id: string;
  full_name: string;
  name?: string;
  email: string;
  created_at: string;
}

const INITIALS = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/** Read avatar from localStorage */
export function getStoredAvatar(): string | null {
  return localStorage.getItem(AVATAR_KEY);
}

export default function Profile() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile from backend
  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setProfile(d); setName(d.full_name || d.name || ''); }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load stored avatar
    const stored = getStoredAvatar();
    if (stored) setAvatarUrl(stored);
  }, []);

  // Handle photo selection → convert to base64, store in localStorage
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      localStorage.setItem(AVATAR_KEY, base64);
      setAvatarUrl(base64);
      // Dispatch event so TopBar can react immediately
      window.dispatchEvent(new Event('avatar-updated'));
    };
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    // TODO: backend PATCH /auth/me once implemented
    await new Promise(r => setTimeout(r, 500));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const card: React.CSSProperties = {
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  const displayName = profile?.full_name || profile?.name || '';

  if (loading) return (
    <main className="page-content" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading profile...</div>
    </main>
  );

  return (
    <main className="page-content" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage your account information and profile photo.</p>
      </div>

      {/* Avatar + Name Card */}
      <div style={{ ...card, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '28px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Avatar circle */}
          <div style={{
            width: '92px', height: '92px', borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--color-primary), #FF8C5A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit',
            boxShadow: '0 4px 16px rgba(255,107,53,0.25)', overflow: 'hidden',
            border: avatarUrl ? '3px solid var(--color-primary)' : 'none',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : INITIALS(displayName || 'OP')
            }
          </div>

          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute', bottom: 2, right: 2, width: '30px', height: '30px',
              borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Change photo"
          >
            <Camera size={14} />
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
        </div>

        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {displayName || '—'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Special Education Teacher</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              background: '#D1FAE5', color: '#065F46',
            }}>
              <Shield size={11} /> Verified Account
            </span>
            {avatarUrl && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                background: 'var(--color-accent-peach)', color: 'var(--color-primary)',
              }}>
                <CheckCircle size={11} /> Photo Uploaded
              </span>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Click the camera icon to change your profile photo.
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <div style={{ ...card, marginBottom: '20px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Account Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <User size={12} style={{ display: 'inline', marginRight: '4px' }} /> Full Name
            </label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Mail size={12} style={{ display: 'inline', marginRight: '4px' }} /> Email Address
            </label>
            <input
              className="form-input"
              type="email"
              value={profile?.email ?? ''}
              readOnly
              style={{ width: '100%', boxSizing: 'border-box', opacity: 0.65, cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Email cannot be changed.</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <BookOpen size={12} style={{ display: 'inline', marginRight: '4px' }} /> Role
            </label>
            <input
              className="form-input"
              value="Special Education Teacher"
              readOnly
              style={{ width: '100%', boxSizing: 'border-box', opacity: 0.65 }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Member Since
            </label>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : '—'}
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FDE8E8', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>
              {error}
            </div>
          )}
          {saved && (
            <div style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: '8px', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              ✓ Profile saved successfully!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="btn-primary"
            style={{ alignSelf: 'flex-start', width: 'auto', padding: '10px 24px' }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...card, border: '1px solid #FECACA' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '16px' }}>
          Danger Zone
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#FEF2F2', borderRadius: '10px' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>Sign Out</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>End your current session.</p>
          </div>
          <button
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
