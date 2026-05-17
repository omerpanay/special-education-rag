import { useState, useEffect, type FormEvent } from 'react';
import { FileText, Sparkles, ChevronDown, ChevronRight, User, RefreshCw, Printer, FileCheck, Check, Target, BookOpen, Building } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student { id: string; name: string; disability_type: string; grade_level: number; }

interface IEPDraft {
  id: string; student_id: string; student_name: string;
  content: any; version: number; status: string;
  teacher_notes?: string; created_at: string; updated_at: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia', otizm: 'Autism', zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment', bedensel: 'Physical Disability', dehb: 'ADHD',
};

const STATUS: Record<string, { text: string; bg: string; color: string }> = {
  draft: { text: 'Draft', bg: '#FEF3C7', color: '#92400E' },
  reviewed: { text: 'Reviewed', bg: '#DBEAFE', color: '#1E40AF' },
  finalized: { text: 'Finalized', bg: '#D1FAE5', color: '#065F46' },
};

export default function IEPGenerator() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentDraft, setCurrentDraft] = useState<IEPDraft | null>(null);
  const [drafts, setDrafts] = useState<IEPDraft[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ student_info: true, performance: true, plan: true, decisions: false });

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/students`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const data = await res.json(); setStudents(data.items || []); }
    } catch {}
  };

  const fetchDrafts = async (studentId: string) => {
    if (!studentId) { setDrafts([]); return; }
    try {
      const res = await fetch(`${API}/iep/student/${studentId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const data = await res.json(); setDrafts(data.items || []); }
    } catch {}
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id); setCurrentDraft(null); setError(''); fetchDrafts(id);
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch(`${API}/iep/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ student_id: selectedStudentId, additional_notes: additionalNotes || undefined }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || `Error ${res.status}: Generation failed`);
        setGenerating(false);
        return;
      }
      const newDraft = await res.json();
      setCurrentDraft(newDraft);
      // Auto-expand all sections
      setExpandedSections({ student_info: true, performance: true, plan: true, decisions: true });
      setAdditionalNotes('');
      fetchDrafts(selectedStudentId);
    } catch (err: any) {
      setError(err?.message || 'Connection error. Make sure backend is running.');
    }
    setGenerating(false);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!currentDraft) return;
    try {
      // Backend uses PATCH /{iep_id} with IEPUpdateRequest
      const res = await fetch(`${API}/iep/${currentDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { const updated = await res.json(); setCurrentDraft(updated); fetchDrafts(selectedStudentId); }
    } catch {}
  };

  const handlePrint = () => { window.print(); };

  const toggleSection = (section: string) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const card: React.CSSProperties = {
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => (
    <div style={{ marginBottom: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => toggleSection(id)}
        style={{ width: '100%', padding: '16px 20px', background: expandedSections[id] ? 'var(--color-accent-peach)' : 'var(--bg-surface-alt)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
      >
        <span style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon size={17} style={{ color: 'var(--color-primary)' }} /> {title}
        </span>
        {expandedSections[id] ? <ChevronDown size={18} color="var(--color-primary)" /> : <ChevronRight size={18} color="var(--text-secondary)" />}
      </button>
      {expandedSections[id] && (
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)' }}>
          {children}
        </div>
      )}
    </div>
  );

  const renderDraftContent = () => {
    if (!currentDraft?.content) return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '14px' }}>IEP content is being processed. Please refresh in a moment.</p>
      </div>
    );
    const c = currentDraft.content;
    // Handle case where content might be a string (shouldn't happen but guard anyway)
    if (typeof c !== 'object') return (
      <div style={{ padding: '20px', background: 'var(--bg-surface-alt)', borderRadius: '12px', fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
        {String(c)}
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* 1. Student Info */}
        <Section id="student_info" title="1. Student Information" icon={User}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              { label: 'Full Name', value: c.student_info?.name || currentDraft.student_name || '—' },
              { label: 'Disability Type', value: c.student_info?.disability_type || '—' },
              { label: 'Grade Level', value: c.student_info?.grade_level ? `Grade ${c.student_info.grade_level}` : '—' },
              { label: 'Educational Diagnosis', value: c.student_info?.educational_diagnosis || '—' },
            ].map(row => (
              <div key={row.label}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{row.label}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{row.value}</p>
              </div>
            ))}
            {c.student_info?.environment_adjustments && (
              <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'var(--bg-surface-alt)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Environment Adjustments</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{c.student_info.environment_adjustments}</p>
              </div>
            )}
          </div>
        </Section>

        {/* 2. Performance Assessment */}
        <Section id="performance" title="2. Present Levels of Performance" icon={BookOpen}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {c.performance_assessment?.development_history && (
              <div style={{ padding: '14px', background: 'var(--bg-surface-alt)', borderRadius: '10px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Development History</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{c.performance_assessment.development_history}</p>
              </div>
            )}
            {c.performance_assessment?.areas?.map((area: any, i: number) => (
              <div key={i} style={{ padding: '14px', background: 'var(--bg-surface-alt)', borderRadius: '10px', borderLeft: '4px solid var(--color-primary)' }}>
                <h4 style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>{area.area_name}</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{area.performance_level}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. Education Plan */}
        <Section id="plan" title="3. Annual Goals & Objectives" icon={Target}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {c.education_plan?.map((plan: any, i: number) => (
              <div key={i} style={{ padding: '16px', background: 'var(--bg-surface-alt)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{plan.development_area}</h4>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: 'var(--color-accent-peach)', color: 'var(--color-primary)' }}>Goal {i + 1}</span>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--color-primary-dim)' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px', textTransform: 'uppercase' }}>Annual Goal</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{plan.long_term_goal}</p>
                </div>
                {plan.short_term_goals?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Short-Term Objectives</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {plan.short_term_goals.map((stg: any, j: number) => (
                        <div key={j} style={{ padding: '10px 14px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: 500 }}>{stg.goal}</p>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {stg.criterion && <span style={{ fontSize: '12px', color: '#2D936C', fontWeight: 600 }}>✓ {stg.criterion}</span>}
                            {stg.evaluation_method && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📊 {stg.evaluation_method}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Unit Decisions */}
        {c.unit_decisions && (
          <Section id="decisions" title="4. Unit Decisions & Support Services" icon={Building}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Family Info Frequency', value: c.unit_decisions.family_info_frequency },
                { label: 'Info Method', value: c.unit_decisions.family_info_method },
                { label: 'Family Education', value: c.unit_decisions.family_education ? 'Yes' : 'No' },
                { label: 'Education Method', value: c.unit_decisions.family_education_method },
              ].filter(r => r.value).map(row => (
                <div key={row.label}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{row.label}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{String(row.value)}</p>
                </div>
              ))}
            </div>
            {c.unit_decisions.school_services?.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>School Services</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {c.unit_decisions.school_services.map((svc: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-surface-alt)', borderRadius: '8px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{svc.service_type}</span>
                      {svc.area && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{svc.area}</span>}
                      {svc.weekly_hours && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', padding: '2px 8px', background: 'var(--color-accent-peach)', borderRadius: '999px' }}>{svc.weekly_hours}h/week</span>}
                      {svc.responsible && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>by {svc.responsible}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}
      </div>
    );
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const statusInfo = currentDraft ? (STATUS[currentDraft.status] ?? STATUS.draft) : null;

  return (
    <main className="page-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>AI IEP Generator</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Draft Individualized Education Programs aligned with MEB standards using AI.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={card}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} /> Generate New IEP
            </h3>
            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Student</label>
                <select className="form-select" style={{ width: '100%' }} value={selectedStudentId} onChange={e => handleStudentChange(e.target.value)} required>
                  <option value="">— Choose a student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({DISABILITY_LABELS[s.disability_type] || s.disability_type})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher Notes (Optional)</label>
                <textarea className="form-textarea" rows={4} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="E.g., Student has improved in math but struggles with peer interaction..."
                  value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} />
              </div>
              {selectedStudent && (
                <div style={{ padding: '12px 14px', background: 'var(--color-accent-peach)', borderRadius: '10px', border: '1px solid var(--color-primary-dim)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedStudent.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{DISABILITY_LABELS[selectedStudent.disability_type]} · Grade {selectedStudent.grade_level}</div>
                  </div>
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={generating || !selectedStudentId}>
                {generating ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating AI IEP...</> : <><Sparkles size={16} /> Generate with AI</>}
              </button>
              {error && <div style={{ padding: '10px 14px', background: '#FDE8E8', borderRadius: '8px', fontSize: '13px', color: 'var(--color-danger)' }}>{error}</div>}
            </form>
          </div>

          {/* Draft History */}
          {drafts.length > 0 && (
            <div style={card}>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Draft History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {drafts.map(draft => {
                  const s = STATUS[draft.status] ?? STATUS.draft;
                  const isActive = currentDraft?.id === draft.id;
                  return (
                    <button key={draft.id} onClick={() => setCurrentDraft(draft)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px',
                      border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                      background: isActive ? 'var(--color-accent-peach)' : 'var(--bg-surface-alt)',
                      cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Version {draft.version}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(draft.created_at).toLocaleString()}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: s.bg, color: s.color }}>{s.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div style={card}>
          {!currentDraft ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '480px', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--color-accent-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <FileText size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No IEP Selected</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '320px' }}>Select a student and generate an AI-powered IEP, or click a draft from history.</p>
            </div>
          ) : (
            <div>
              {/* Draft Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h2 style={{ fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>IEP Draft v{currentDraft.version}</h2>
                    {statusInfo && <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.text}</span>}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                    Student: <strong style={{ color: 'var(--text-primary)' }}>{currentDraft.student_name || currentDraft.content?.student_info?.name || '—'}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {currentDraft.status === 'draft' && (
                    <button className="btn-primary" onClick={() => handleUpdateStatus('reviewed')} style={{ width: 'auto', padding: '8px 16px' }}>
                      <FileCheck size={15} /> Mark Reviewed
                    </button>
                  )}
                  {currentDraft.status === 'reviewed' && (
                    <button onClick={() => handleUpdateStatus('finalized')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2D936C', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      <Check size={15} /> Finalize IEP
                    </button>
                  )}
                  <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Printer size={15} /> Print
                  </button>
                </div>
              </div>
              {renderDraftContent()}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
