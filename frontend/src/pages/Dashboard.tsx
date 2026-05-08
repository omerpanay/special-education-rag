import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquareText, Users,
  ArrowRight, Eye, Sparkles, ClipboardList,
  Cpu, Database, Zap, ArrowRightCircle, PenLine, Image,
} from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface DashboardData {
  total_students: number;
  total_sessions: number;
  source_stats: { total_sources: number; total_chunks: number; total_queries: number };
  students_summary: { id: string; name: string; disability_type: string }[];
}

const PIPELINE_STEPS = [
  { icon: PenLine,           label: 'Writer Agent',   desc: 'Generates scene-by-scene story text via Llama 3.1',         color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { icon: MessageSquareText, label: 'Prompt Agent',   desc: 'Converts each scene into an image-generation prompt',       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { icon: Image,             label: 'Image Agent',    desc: 'Generates illustrations via HuggingFace FLUX.1-schnell',    color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { icon: FileText,          label: 'PDF Builder',    desc: 'Assembles story + images into a downloadable PDF',          color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
];

const TECH_BADGES = [
  { label: 'FastAPI',    color: '#10b981' },
  { label: 'LangGraph',  color: '#6366f1' },
  { label: 'pgvector',   color: '#3b82f6' },
  { label: 'Llama 3.1',  color: '#f59e0b' },
  { label: 'FLUX.1',     color: '#ec4899' },
  { label: 'React + TS', color: '#38bdf8' },
];

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia', otizm: 'Autism Spectrum', zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment', bedensel: 'Physical Disability', dehb: 'ADHD',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Academic Sources', value: data?.source_stats.total_sources ?? '…', icon: FileText,          color: 'var(--color-primary-light)' },
    { label: 'RAG Queries',      value: data?.source_stats.total_queries ?? '…', icon: MessageSquareText, color: 'var(--color-accent)'        },
    { label: 'Students',         value: data?.total_students ?? '…',             icon: Users,             color: 'var(--color-warning)'       },
    { label: 'Vector Chunks',    value: data?.source_stats.total_chunks ?? '…',  icon: Database,          color: '#ec4899'                    },
  ];

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
          {/* Stats */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {stats.map((s, i) => (
              <div key={i} className="stat-card">
                <s.icon size={20} className="stat-icon" style={{ color: s.color }} />
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Quick Access */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { to: '/query',        icon: MessageSquareText, title: 'Ask a Question',    desc: 'Hybrid RAG over academic PDFs',             color: 'var(--color-primary)' },
              { to: '/sources',      icon: FileText,          title: 'Sources',            desc: 'Upload & index PDF documents',              color: 'var(--color-accent)'  },
              { to: '/students',     icon: Users,             title: 'Students',           desc: 'Manage student profiles',                   color: 'var(--color-warning)' },
              { to: '/observations', icon: Eye,               title: 'Observations',       desc: 'AI-powered ABC behavior analysis',          color: '#f59e0b'              },
              { to: '/materials',    icon: Sparkles,          title: 'Materials',          desc: 'Agentic personalized social stories',       color: '#8b5cf6'              },
              { to: '/iep',          icon: ClipboardList,     title: 'IEP Generator',      desc: 'AI-drafted individualized education plan',  color: '#ec4899'              },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="card" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={18} color={item.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </Link>
            ))}
          </div>

          {/* Agentic Pipeline Visualization */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Zap size={18} color="#8b5cf6" />
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Multi-Agent Material Generation Pipeline</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', fontWeight: 600 }}>
                LangGraph
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
              {PIPELINE_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      flex: 1, padding: '16px 12px', borderRadius: 12, cursor: 'default',
                      background: hovered === i ? step.bg : 'var(--bg-elevated)',
                      border: `1px solid ${hovered === i ? step.color + '50' : 'var(--border-subtle)'}`,
                      transition: 'all 0.2s ease', textAlign: 'center', minWidth: 0,
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, margin: '0 auto 10px',
                      background: step.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${step.color}30`,
                      transform: hovered === i ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                    }}>
                      <step.icon size={20} color={step.color} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: 4, color: hovered === i ? step.color : 'var(--text-primary)' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {step.desc}
                    </div>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div style={{ padding: '0 5px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      <ArrowRightCircle size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack + Recent Students */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={16} color="var(--color-primary-light)" /> Tech Stack
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TECH_BADGES.map((b, i) => (
                  <span key={i} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    background: b.color + '15', color: b.color, border: `1px solid ${b.color}30`,
                  }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recently Added Students</h3>
              {data && data.students_summary.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.students_summary.slice(0, 5).map(s => (
                    <Link key={s.id} to={`/student/${s.id}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)', textDecoration: 'none',
                    }}>
                      <span style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className={`badge ${s.disability_type === 'disleksi' ? 'badge-meb' : s.disability_type === 'otizm' ? 'badge-makale' : 'badge-yok'}`}>
                        {DISABILITY_LABELS[s.disability_type] || s.disability_type}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No students yet. <Link to="/students">Add one →</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
