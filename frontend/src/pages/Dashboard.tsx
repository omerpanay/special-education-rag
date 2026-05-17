import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Users, MessageSquareText, Target, Database, ChevronRight, ClipboardList, Upload, BarChart2 } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface StudentSummary {
  id: string;
  name: string;
  disability_type: string;
  sessions_count: number;
  iep_count: number;
  observation_count: number;
  accuracy_trend: string;
}

interface SourceStats {
  total_sources: number;
  total_chunks: number;
  total_queries: number;
}

interface DashboardData {
  total_students: number;
  total_sessions: number;
  avg_accuracy_all: number;
  students_summary: StudentSummary[];
  source_stats: SourceStats;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia',
  otizm: 'Autism Spectrum Disorder',
  zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment',
  bedensel: 'Physical Disability',
  dehb: 'ADHD',
};

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div style={{
      background: accent ? 'var(--color-primary)' : 'var(--bg-main)',
      border: accent ? 'none' : '1px solid var(--border-subtle)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      flex: '1 1 0',
      minWidth: '160px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: accent ? 'rgba(255,255,255,0.2)' : 'var(--color-accent-peach)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent ? '#fff' : 'var(--color-primary)',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit', color: accent ? '#fff' : 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: '13px', color: accent ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', marginTop: '4px' }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: '11px', color: accent ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: '2px' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const students = data?.students_summary ?? [];

  return (
    <div className="page-content">
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Welcome back! Here's an overview of your caseload and activity.
        </p>
      </div>

      {/* Analytics Stat Cards — from DashboardResponse */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <StatCard
          icon={<Users size={20} />}
          label="Total Students"
          value={loading ? '–' : (data?.total_students ?? 0)}
          accent
        />
        <StatCard
          icon={<MessageSquareText size={20} />}
          label="AI Sessions"
          value={loading ? '–' : (data?.total_sessions ?? 0)}
          sub="Total RAG queries"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Avg. Accuracy"
          value={loading ? '–' : `${Math.round((data?.avg_accuracy_all ?? 0) * 100)}%`}
          sub="Across all students"
        />
        <StatCard
          icon={<Database size={20} />}
          label="Knowledge Base"
          value={loading ? '–' : (data?.source_stats?.total_sources ?? 0)}
          sub={`${data?.source_stats?.total_chunks ?? 0} indexed chunks`}
        />
      </div>

      {/* Two column layout: Student Caseload + Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left: Student Caseload */}
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600 }}>My Caseload</h2>
            <span style={{ background: 'var(--color-accent-peach)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '999px' }}>
              {loading ? '...' : `${students.length} Students`}
            </span>
          </div>

          <div style={{ padding: '8px' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
            ) : students.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Users size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No students yet.</p>
                <button
                  onClick={() => navigate('/students')}
                  style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  + Add First Student
                </button>
              </div>
            ) : (
              students.map(s => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/student/${s.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-alt)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-accent-peach)', color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px',
                  }}>
                    {s.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {DISABILITY_LABELS[s.disability_type] ?? s.disability_type}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              ))
            )}
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }}>
              <button
                onClick={() => navigate('/students')}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <PlusCircle size={15} /> Add Student
              </button>
            </div>
          </div>
        </div>

        {/* Right: Main content area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Quick Actions */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { icon: <ClipboardList size={22} />, label: 'New IEP', sub: 'Generate with AI', path: '/iep', accent: true },
                { icon: <Users size={22} />, label: 'Add Student', sub: 'Create profile', path: '/students', accent: false },
                { icon: <Upload size={22} />, label: 'Upload Source', sub: 'PDF / Document', path: '/sources', accent: false },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  style={{
                    background: action.accent ? 'var(--color-primary)' : 'var(--bg-surface-alt)',
                    border: `1px solid ${action.accent ? 'transparent' : 'var(--border-subtle)'}`,
                    borderRadius: '12px', padding: '20px 16px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left',
                    color: action.accent ? '#fff' : 'var(--text-primary)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ color: action.accent ? 'rgba(255,255,255,0.9)' : 'var(--color-primary)' }}>
                    {action.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{action.label}</div>
                    <div style={{ fontSize: '12px', color: action.accent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: '2px' }}>
                      {action.sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Analytics Summary from students_summary */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} style={{ color: 'var(--color-primary)' }} /> Student Progress Overview
              </h2>
              <button
                onClick={() => navigate('/students')}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                View All →
              </button>
            </div>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : students.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No student data yet. Add students to see their progress here.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-alt)' }}>
                    {['Student', 'Disability Type', 'Sessions', 'IEPs', 'Observations', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-accent-peach)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {DISABILITY_LABELS[s.disability_type] ?? s.disability_type}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 700, color: s.sessions_count > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                          {s.sessions_count}
                          {s.sessions_count > 0 && <span style={{ fontSize: '10px', background: 'var(--color-accent-peach)', padding: '1px 5px', borderRadius: '4px', color: 'var(--color-primary)', fontWeight: 600 }}>chats</span>}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: (s.iep_count ?? 0) > 0 ? '#2D936C' : 'var(--text-muted)' }}>
                          {s.iep_count ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: (s.observation_count ?? 0) > 0 ? '#7C3AED' : 'var(--text-muted)' }}>
                          {s.observation_count ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => navigate(`/student/${s.id}`)}
                          style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          View <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
