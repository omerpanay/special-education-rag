import { useState, useEffect } from 'react';
import { Bell, Globe, Moon, Sun, Shield, Database, ChevronRight, Key, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DARK_KEY = 'sensei_dark_mode';

export default function Settings() {
  const { logout } = useAuth();
  const [emailNotif, setEmailNotif] = useState(() => localStorage.getItem('sensei_email_notif') !== 'false');
  const [pushNotif, setPushNotif] = useState(() => localStorage.getItem('sensei_push_notif') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_KEY) === 'true');
  const [language, setLanguage] = useState(() => localStorage.getItem('sensei_lang') || 'en');
  const [saved, setSaved] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

  const handleSave = () => {
    localStorage.setItem('sensei_email_notif', String(emailNotif));
    localStorage.setItem('sensei_push_notif', String(pushNotif));
    localStorage.setItem(DARK_KEY, String(darkMode));
    localStorage.setItem('sensei_lang', language);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      platform: 'SENSEI v1.0.0',
      note: 'Full data export would be implemented via backend API in production.',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensei-data-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const card: React.CSSProperties = {
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: '20px',
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer',
        background: value ? 'var(--color-primary)' : 'var(--border-strong)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: value ? '22px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );

  const SettingRow = ({
    icon: Icon, title, desc, right, onClick
  }: { icon: any; title: string; desc: string; right: React.ReactNode; onClick?: () => void }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', borderBottom: '1px solid var(--border-subtle)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-accent-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
        </div>
      </div>
      {right}
    </div>
  );

  return (
    <main className="page-content" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Customize your SENSEI experience.</p>
      </div>

      {/* Notifications */}
      <div style={card}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={17} style={{ color: 'var(--color-primary)' }} /> Notifications
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Choose when and how to receive notifications.</p>
        <SettingRow icon={Bell} title="Email Notifications" desc="Weekly summary of student activity" right={<Toggle value={emailNotif} onChange={setEmailNotif} />} />
        <SettingRow icon={Bell} title="In-App Notifications" desc="IEP updates and new AI responses" right={<Toggle value={pushNotif} onChange={setPushNotif} />} />
      </div>

      {/* Appearance */}
      <div style={card}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {darkMode ? <Moon size={17} style={{ color: 'var(--color-primary)' }} /> : <Sun size={17} style={{ color: 'var(--color-primary)' }} />} Appearance
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Adjust how SENSEI looks.</p>
        <SettingRow
          icon={darkMode ? Moon : Sun}
          title="Dark Mode"
          desc="Switch to a darker interface theme"
          right={<Toggle value={darkMode} onChange={setDarkMode} />}
        />
        <SettingRow
          icon={Globe}
          title="Language"
          desc="Interface language preference"
          right={
            <select
              className="form-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{ width: '120px', fontSize: '13px' }}
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </select>
          }
        />
      </div>

      {/* Privacy & Security */}
      <div style={card}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={17} style={{ color: 'var(--color-primary)' }} /> Privacy & Security
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Manage data and security settings.</p>

        {/* Change Password */}
        <SettingRow
          icon={Key}
          title="Change Password"
          desc="Update your account password"
          onClick={() => setShowPasswordDialog(v => !v)}
          right={<ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
        />
        {showPasswordDialog && (
          <div style={{ padding: '16px', background: 'var(--bg-surface-alt)', borderRadius: '10px', margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="password" className="form-input" placeholder="Current password" style={{ width: '100%', boxSizing: 'border-box' }} />
            <input type="password" className="form-input" placeholder="New password" style={{ width: '100%', boxSizing: 'border-box' }} />
            <input type="password" className="form-input" placeholder="Confirm new password" style={{ width: '100%', boxSizing: 'border-box' }} />
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px', alignSelf: 'flex-start' }}>Update Password</button>
          </div>
        )}

        {/* Data Export */}
        <SettingRow
          icon={Download}
          title="Export My Data"
          desc="Download all your data (GDPR/KVKK compliant)"
          onClick={handleExportData}
          right={<ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
        />

        {/* Delete Account */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FDE8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={17} style={{ color: 'var(--color-danger)' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-danger)' }}>Delete Account</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Permanently remove your account and all data</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* System Info */}
      <div style={card}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={17} style={{ color: 'var(--color-primary)' }} /> System Information
        </h3>
        {[
          { k: 'Platform Version', v: 'SENSEI v1.0.0' },
          { k: 'Backend', v: 'FastAPI + PostgreSQL + pgvector' },
          { k: 'AI Engine', v: 'Adaptive RAG + Tavily Web Search' },
          { k: 'Embedding Model', v: 'multilingual-e5-large' },
          { k: 'LLM', v: 'Groq (LLaMA 3.1)' },
          { k: 'LangSmith', v: 'Integration Ready ✓' },
        ].map(row => (
          <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{row.k}</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>{row.v}</span>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={handleSave} className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }}>
          Save Settings
        </button>
        {saved && (
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#065F46', background: '#D1FAE5', padding: '8px 14px', borderRadius: '8px' }}>
            ✓ Settings saved!
          </span>
        )}
      </div>
    </main>
  );
}
