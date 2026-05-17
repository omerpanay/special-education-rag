import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Trash2, Eye, User, GraduationCap, FileText, ChevronRight } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student {
  id: string; name: string; disability_type: string;
  grade_level: number; competency_notes?: string;
  is_active: boolean; created_at: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia',
  otizm: 'Autism Spectrum Disorder',
  zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment',
  bedensel: 'Physical Disability',
  dehb: 'ADHD',
};

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dtype, setDtype] = useState('disleksi');
  const [grade, setGrade] = useState('3');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/students`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.items || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name, disability_type: dtype,
          grade_level: parseInt(grade),
          competency_notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || 'An error occurred');
      } else {
        setShowModal(false);
        setName(''); setNotes('');
        fetchStudents();
      }
    } catch { setError('Connection error'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this student?')) return;
    await fetch(`${API}/students/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchStudents();
  };

  return (
    <main className="page-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="font-headline-lg">Student Directory</h2>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)' }}>Manage student profiles, view dashboards, and track personalized progress.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}>
          <Plus size={18} /> Add Student
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>Loading...</div>
      ) : students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'var(--bg-surface-alt)', borderRadius: '16px', border: '1px dashed var(--border-strong)' }}>
          <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 className="font-headline-md" style={{ marginBottom: '8px' }}>No students found</h3>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)' }}>Get started by adding your first student.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {students.map(student => (
            <div 
              key={student.id} 
              style={{ 
                background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px',
                boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
              }}
              onClick={() => navigate(`/student/${student.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              <button 
                onClick={(e) => handleDelete(student.id, e)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Delete Student"
              >
                <Trash2 size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-peach)', 
                  color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700
                }}>
                  {student.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-headline-md" style={{ fontSize: '18px', margin: 0 }}>{student.name}</h3>
                  <div className="status-badge" style={{ marginTop: '4px' }}>
                    <span className="status-dot success"></span> Active
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <User size={16} /> <span>{DISABILITY_LABELS[student.disability_type] || student.disability_type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <GraduationCap size={16} /> <span>Grade {student.grade_level}</span>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>View Profile</span>
                <ChevronRight size={18} color="var(--color-primary)" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px'
        }}>
          <div style={{ 
            background: 'var(--bg-main)', borderRadius: '24px', width: '100%', maxWidth: '500px', 
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="font-headline-md">Add New Student</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && <div style={{ color: 'var(--color-danger)', fontSize: '14px', background: '#FDE8E8', padding: '12px', borderRadius: '8px' }}>{error}</div>}
              
              <div>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="John Doe" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Disability Category</label>
                  <select className="form-select" value={dtype} onChange={e => setDtype(e.target.value)}>
                    {Object.entries(DISABILITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Grade Level</label>
                  <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="form-label">Present Levels & Notes</label>
                <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Brief summary of present levels of performance..."></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
