import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquareText, Users, ArrowRight, Eye, Sparkles } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface DashboardData {
  total_students: number;
  total_sessions: number;
  source_stats: { total_sources: number; total_chunks: number; total_queries: number };
  students_summary: { id: string; name: string; disability_type: string }[];
}

export default function Dashboard() {
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

  const stats = [
    { label: 'Academic Sources', value: data?.source_stats.total_sources ?? '...', icon: FileText, color: 'var(--color-primary-light)' },
    { label: 'RAG Queries', value: data?.source_stats.total_queries ?? '...', icon: MessageSquareText, color: 'var(--color-accent)' },
    { label: 'Students', value: data?.total_students ?? '...', icon: Users, color: 'var(--color-warning)' },
  ];

  const DISABILITY_LABELS: Record<string, string> = {
    disleksi: 'Dyslexia', otizm: 'Autism Spectrum', zihin_yetersizligi: 'Intellectual Disability',
    isitme: 'Hearing Impairment', bedensel: 'Physical Disability', dehb: 'ADHD',
  };

  return (
    <div>
      <div className="page-header">
        <h2><LayoutDashboard size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />Dashboard</h2>
        <p>Welcome to EduRAG — AI-powered special education assistant</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stat-grid">
            {stats.map((s, i) => (
              <div key={i} className="stat-card">
                <s.icon size={20} className="stat-icon" style={{ color: s.color }} />
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Quick Access */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { to: '/query', icon: MessageSquareText, title: 'Ask a Question', desc: 'Query academic sources with AI', color: 'var(--color-primary)' },
              { to: '/sources', icon: FileText, title: 'Sources', desc: 'Upload and manage PDF documents', color: 'var(--color-accent)' },
              { to: '/students', icon: Users, title: 'Students', desc: 'Manage student profiles', color: 'var(--color-warning)' },
              { to: '/observations', icon: Eye, title: 'Observations', desc: 'AI-powered ABC behavior analysis', color: '#f59e0b' },
              { to: '/materials', icon: Sparkles, title: 'Material Generator', desc: 'Generate personalized social stories', color: '#8b5cf6' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="card" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={20} color={item.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </Link>
            ))}
          </div>

          {/* Recent Students */}
          {data && data.students_summary.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recently Added Students</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.students_summary.slice(0, 5).map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)',
                  }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span className={`badge ${s.disability_type === 'disleksi' ? 'badge-meb' : s.disability_type === 'otizm' ? 'badge-makale' : 'badge-yok'}`}>
                      {DISABILITY_LABELS[s.disability_type] || s.disability_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
