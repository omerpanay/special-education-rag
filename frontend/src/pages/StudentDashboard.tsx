import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, ArrowLeft, FileText, MessageSquare,
  Shield, ShieldCheck, ClipboardList, Eye, Sparkles, Activity, MessageCircle
} from 'lucide-react';
import { getObservations, getStudentMaterials, type ObservationOut, type MaterialOut } from '../services/api';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student { id: string; name: string; disability_type: string; grade_level: number; competency_notes?: string; is_active: boolean; created_at: string; }
interface ConsentStatus { data_processing: boolean; ai_analysis: boolean; game_participation: boolean; granted_at?: string; }
interface IEPSummary { id: string; version: number; status: string; created_at: string; }
interface ConvSummary { id: string; title: string; message_count: number; created_at: string; }

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia', otizm: 'Autism Spectrum Disorder',
  zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment', bedensel: 'Physical Disability', dehb: 'ADHD',
};

const DISABILITY_COLORS: Record<string, string> = {
  disleksi: '#3B82F6', otizm: '#8B5CF6', zihin_yetersizligi: '#F59E0B',
  isitme: '#2D936C', bedensel: '#6B7280', dehb: '#EF4444',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#FEF3C7', color: '#92400E' },
  reviewed: { bg: '#DBEAFE', color: '#1E40AF' },
  finalized: { bg: '#D1FAE5', color: '#065F46' },
};

export default function StudentDashboard() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [ieps, setIeps] = useState<IEPSummary[]>([]);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [observations, setObservations] = useState<ObservationOut[]>([]);
  const [materials, setMaterials] = useState<MaterialOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (studentId) fetchAll(studentId); }, [studentId]);

  const fetchAll = async (id: string) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };
    try {
      const [stuRes, conRes, iepRes, convRes] = await Promise.all([
        fetch(`${API}/students/${id}`, { headers }),
        fetch(`${API}/consent/${id}`, { headers }),
        fetch(`${API}/iep/student/${id}`, { headers }),
        fetch(`${API}/conversations`, { headers }),
      ]);
      if (stuRes.ok) setStudent(await stuRes.json());
      if (conRes.ok) setConsent(await conRes.json());
      if (iepRes.ok) { const d = await iepRes.json(); setIeps(d.items || []); }
      if (convRes.ok) { const d = await convRes.json(); setConversations(d.items || []); }
      try { const o = await getObservations(id); setObservations(o.observations || []); } catch {}
      try { const m = await getStudentMaterials(id); setMaterials(Array.isArray(m) ? m : []); } catch {}
    } catch {}
    setLoading(false);
  };

  const toggleConsent = async (consentType: string, currentValue: boolean) => {
    if (!studentId) return;
    const endpoint = currentValue ? 'revoke' : 'grant';
    try {
      const res = await fetch(`${API}/consent/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ student_id: studentId, consent_types: [consentType] }),
      });
      if (res.ok) setConsent(await res.json());
    } catch {}
  };

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--color-accent-peach)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading student profile...</p>
      </div>
    </div>
  );

  if (!student) return (
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Student not found</p>
        <Link to="/students" style={{ padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Back to Students
        </Link>
      </div>
    </div>
  );

  const disabilityColor = DISABILITY_COLORS[student.disability_type] ?? 'var(--color-primary)';

  const card = (style?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    ...style,
  });

  return (
    <div className="page-content">
      {/* Back Link */}
      <Link to="/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', marginBottom: '20px', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <ArrowLeft size={16} /> Back to Students
      </Link>

      {/* Profile Header */}
      <div style={{ ...card(), marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: `${disabilityColor}18`, border: `2px solid ${disabilityColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={36} style={{ color: disabilityColor }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: 'Outfit', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{student.name}</h1>
            {student.is_active && (
              <span style={{ padding: '3px 10px', background: '#D1FAE5', color: '#065F46', borderRadius: '999px', fontSize: '12px', fontWeight: 700, border: '1px solid #6EE7B7' }}>ACTIVE</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, background: `${disabilityColor}15`, color: disabilityColor, border: `1px solid ${disabilityColor}30` }}>
              {DISABILITY_LABELS[student.disability_type] || student.disability_type}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Grade {student.grade_level}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Enrolled {new Date(student.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        <Link to={`/query`} state={{ studentId: student.id }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--color-primary)', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
        >
          <MessageCircle size={16} /> Ask SENSEI
        </Link>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'IEP Drafts', value: ieps.length, icon: ClipboardList, color: 'var(--color-primary)' },
          { label: 'Conversations', value: conversations.length, icon: MessageSquare, color: '#3B82F6' },
          { label: 'Observations', value: observations.length, icon: Eye, color: '#F59E0B' },
          { label: 'Materials', value: materials.length, icon: Sparkles, color: '#2D936C' },
        ].map(stat => (
          <div key={stat.label} style={{ ...card(), textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Student Details */}
        <div style={card()}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Student Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: 'Full Name', value: student.name },
              { label: 'Diagnosis', value: DISABILITY_LABELS[student.disability_type] || student.disability_type },
              { label: 'Grade Level', value: `Grade ${student.grade_level}` },
              { label: 'Enrolled', value: new Date(student.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
            {student.competency_notes && (
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-surface-alt)', borderRadius: '10px', borderLeft: '3px solid var(--color-primary)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Competency Notes</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{student.competency_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* GDPR Consent */}
        <div style={card()}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: 'var(--color-primary)' }} /> Data Processing (GDPR)
          </h3>
          {consent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'data_processing', label: 'Core Data Processing', desc: 'Required for platform access' },
                { key: 'ai_analysis', label: 'AI Performance Analysis', desc: 'Allows generation of insights' },
                { key: 'game_participation', label: 'Educational Games', desc: 'Interactive sessions participation' },
              ].map(item => {
                const isGranted = (consent as any)[item.key];
                return (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '10px', background: isGranted ? '#F0FDF4' : 'var(--bg-surface-alt)', border: `1px solid ${isGranted ? '#BBF7D0' : 'var(--border-subtle)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {isGranted ? <ShieldCheck size={18} style={{ color: '#2D936C', flexShrink: 0, marginTop: '1px' }} /> : <Shield size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }} />}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                      </div>
                    </div>
                    <label style={{ position: 'relative', width: '46px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={isGranted} onChange={() => toggleConsent(item.key, isGranted)} style={{ display: 'none' }} />
                      <span style={{ position: 'absolute', inset: 0, borderRadius: '13px', background: isGranted ? '#2D936C' : '#D1D5DB', transition: 'background 0.2s' }}>
                        <span style={{ position: 'absolute', top: '3px', left: isGranted ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                      </span>
                    </label>
                  </div>
                );
              })}
              {consent.granted_at && <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>Last updated: {new Date(consent.granted_at).toLocaleDateString()}</p>}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-surface-alt)', borderRadius: '10px' }}>
              <Shield size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No consent record found.</p>
            </div>
          )}
        </div>

        {/* IEP History */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--color-primary)' }} /> IEP History
            </h3>
            <Link to="/iep" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>Generate New →</Link>
          </div>
          {ieps.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-surface-alt)', borderRadius: '10px' }}>
              <FileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No IEP drafts yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ieps.map(iep => {
                const s = STATUS_COLORS[iep.status] ?? STATUS_COLORS.draft;
                return (
                  <div key={iep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>IEP Version {iep.version}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(iep.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: s.bg, color: s.color }}>{iep.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Observations */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} style={{ color: '#F59E0B' }} /> Observations
            </h3>
            <Link to="/observations" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>Record New →</Link>
          </div>
          {observations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-surface-alt)', borderRadius: '10px' }}>
              <Eye size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No observations recorded.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {observations.slice(0, 4).map(obs => (
                <div key={obs.id} style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#FEF3C720', color: '#B45309', border: '1px solid #FDE68A' }}>{obs.category}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(obs.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                    {obs.summary.length > 100 ? `${obs.summary.substring(0, 100)}...` : obs.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
