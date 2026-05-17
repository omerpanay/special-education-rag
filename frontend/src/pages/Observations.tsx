import { useState, useEffect } from 'react';
import {
  MousePointerClick, MessageCircle, Users, GraduationCap,
  Frown, Activity, PlusCircle, RefreshCw, AlertCircle, ClipboardList,
} from 'lucide-react';
import { createObservation, getObservations, type ObservationOut } from '../services/api';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student { id: string; name: string; disability_type: string; }

const CATEGORIES = [
  { id: 'Attention', label: 'Attention', icon: MousePointerClick },
  { id: 'Communication', label: 'Communication', icon: MessageCircle },
  { id: 'Social', label: 'Social Behavior', icon: Users },
  { id: 'Academic', label: 'Academic Skills', icon: GraduationCap },
  { id: 'Emotional', label: 'Emotional Reg.', icon: Frown },
  { id: 'Motor', label: 'Motor Skills', icon: Activity },
];

const CATEGORY_COLORS: Record<string, string> = {
  Attention: '#FF6B35', Communication: '#2D936C', Social: '#3B82F6',
  Academic: '#8B5CF6', Emotional: '#EF4444', Motor: '#F59E0B',
};

export default function Observations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [summary, setSummary] = useState('');
  const [antecedent, setAntecedent] = useState('');
  const [behavior, setBehavior] = useState('');
  const [consequence, setConsequence] = useState('');
  const [category, setCategory] = useState('Attention');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<ObservationOut[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/students/`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.items || d || [];
        setStudents(list);
        if (list.length > 0) { setSelectedStudent(list[0].id); loadHistory(list[0].id); }
      })
      .catch(() => {});
  }, []);

  const loadHistory = async (studentId: string) => {
    setHistoryLoading(true);
    try { const data = await getObservations(studentId); setHistory(data.observations || []); }
    catch { /* silent */ }
    setHistoryLoading(false);
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedStudent(id); setError(null); loadHistory(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !summary.trim()) return;
    setLoading(true); setError(null); setSuccess(false);
    try {
      await createObservation({
        student_id: selectedStudent, category,
        summary: summary.trim(), antecedent: antecedent.trim(),
        behavior: behavior.trim(), consequence: consequence.trim(),
      });
      setSummary(''); setAntecedent(''); setBehavior(''); setConsequence('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadHistory(selectedStudent);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'An error occurred'); }
    setLoading(false);
  };

  const card: React.CSSProperties = {
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Behavioral Observations
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '580px' }}>
          Record and analyze student behavior with AI-powered ABC (Antecedent, Behavior, Consequence) analysis to track progress and identify triggers.
        </p>
      </div>

      {/* Student Selector */}
      <div style={{ marginBottom: '24px', maxWidth: '360px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Selected Student
        </label>
        <select value={selectedStudent} onChange={handleStudentChange} className="form-select" style={{ width: '100%' }}>
          {students.length === 0 && <option value="">No students available</option>}
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>

        {/* LEFT: New Observation Form */}
        <div style={card}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} style={{ color: 'var(--color-primary)' }} /> New Observation
          </h3>

          {error && (
            <div style={{ padding: '12px 14px', background: '#FDE8E8', border: '1px solid #FECACA', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <AlertCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: '12px 14px', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#065F46', fontWeight: 600 }}>✓ Observation recorded successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Category Grid */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {CATEGORIES.map(c => {
                  const isActive = category === c.id;
                  const color = CATEGORY_COLORS[c.id];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                        border: `2px solid ${isActive ? color : 'var(--border-subtle)'}`,
                        background: isActive ? `${color}15` : 'var(--bg-surface-alt)',
                        color: isActive ? color : 'var(--text-secondary)',
                      }}
                    >
                      <c.icon size={18} />
                      <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observation Summary */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observation Summary *
              </label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Describe the behavior observed, including the context and outcome..."
                className="form-textarea"
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>

            {/* ABC Analysis */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ABC Analysis <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'antecedent', label: 'A — Antecedent (Trigger)', placeholder: 'What happened before the behavior?', value: antecedent, set: setAntecedent, color: '#FF6B35' },
                  { key: 'behavior', label: 'B — Behavior', placeholder: 'Describe the observed behavior...', value: behavior, set: setBehavior, color: '#8B5CF6' },
                  { key: 'consequence', label: 'C — Consequence', placeholder: 'What happened after the behavior?', value: consequence, set: setConsequence, color: '#2D936C' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: field.color, marginBottom: '4px', display: 'block' }}>
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={field.value}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      className="form-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || !selectedStudent || !summary.trim()} className="btn-primary">
              {loading ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><PlusCircle size={16} /> Save Observation</>}
            </button>
          </form>
        </div>

        {/* RIGHT: Observation History */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Observation History
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {history.length} record{history.length !== 1 ? 's' : ''}
            </span>
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-accent-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ClipboardList size={32} style={{ color: 'var(--color-primary)' }} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                No observations recorded yet for this student.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map(obs => {
                const catColor = CATEGORY_COLORS[obs.category] ?? '#FF6B35';
                return (
                  <article key={obs.id} style={card}>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                        background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}40`,
                      }}>
                        {obs.category}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(obs.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#D1FAE5', color: '#065F46', fontSize: '10px', fontWeight: 700 }}>
                          AI
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                      {obs.summary}
                    </p>

                    {/* ABC Tags */}
                    {(obs.antecedent || obs.behavior || obs.consequence) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                        {[
                          { label: 'A', title: 'Antecedent', value: obs.antecedent, color: '#FF6B35' },
                          { label: 'B', title: 'Behavior', value: obs.behavior, color: '#8B5CF6' },
                          { label: 'C', title: 'Consequence', value: obs.consequence, color: '#2D936C' },
                        ].map(abc => (
                          abc.value && (
                            <div key={abc.label} style={{ background: `${abc.color}10`, borderRadius: '8px', padding: '8px 10px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: abc.color, letterSpacing: '0.08em', marginBottom: '2px' }}>
                                {abc.title}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {abc.value}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
