import { useState, useEffect } from 'react';
import { Eye, PlusCircle, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import {
  createObservation,
  getObservations,
  type ObservationOut,
} from '../services/api';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student {
  id: string;
  name: string;
  disability_type: string;
}

const CATEGORY_OPTIONS = ['Davranış', 'Akademik', 'Kriz', 'Sosyal', 'İletişim'];

const CATEGORY_COLORS: Record<string, string> = {
  'Davranış': '#f59e0b',
  'Akademik': '#3b82f6',
  'Kriz': '#ef4444',
  'Sosyal': '#8b5cf6',
  'İletişim': '#10b981',
};

export default function Observations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('Davranış');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ObservationOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ObservationOut[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/students/`, { headers: { Authorization: `Bearer ${getToken()}` }, redirect: 'follow' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.items || d || [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudent(list[0].id);
          loadHistory(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadHistory = async (studentId: string) => {
    setHistoryLoading(true);
    try {
      const data = await getObservations(studentId);
      setHistory(data.observations || []);
    } catch { /* sessiz */ }
    setHistoryLoading(false);
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudent(id);
    setResult(null);
    setError(null);
    loadHistory(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !summary.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const obs = await createObservation({
        student_id: selectedStudent,
        category,
        summary: summary.trim(),
        antecedent: '',
        behavior: '',
        consequence: '',
      });
      setResult(obs);
      setSummary('');
      loadHistory(selectedStudent);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
    setLoading(false);
  };

  const selectedStudentName = students.find(s => s.id === selectedStudent)?.name ?? '';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>
          <Eye size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />
          Gözlem Kayıt
        </h2>
        <p>Öğrenci davranışlarını kaydedin — AI otomatik ABC analizi yapar</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Form Kartı */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={18} color="var(--color-primary-light)" />
              Yeni Gözlem
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Öğrenci Seçici */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Öğrenci
                </label>
                <select
                  value={selectedStudent}
                  onChange={e => handleStudentChange(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Kategori */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Gözlem Kategorisi
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: '0.8rem',
                        border: '1px solid var(--border-subtle)', cursor: 'pointer',
                        background: category === cat ? (CATEGORY_COLORS[cat] + '30') : 'var(--bg-elevated)',
                        color: category === cat ? CATEGORY_COLORS[cat] : 'var(--text-muted)',
                        borderColor: category === cat ? CATEGORY_COLORS[cat] : 'var(--border-subtle)',
                        fontWeight: category === cat ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gözlem Metni */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Gözlem Açıklaması
                </label>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={5}
                  placeholder="Öğrencinin davranışını serbest şekilde anlatın. Örn: 'Matematik dersi sırasında kalem kutusunu yere fırlattı, sınıfı terk etmek istedi. Sakinleştirici nesne verilince 5 dakikada sakinleşti.'"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                    fontSize: '0.9rem', resize: 'vertical', lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  ABC alanlarını boş bırakın — AI otomatik dolduracak
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedStudent || !summary.trim()}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />
                    ABC analizi yapılıyor...
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    Gözlemi Kaydet
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.85rem',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* ABC Sonuç Kartı */}
          {result && (
            <div className="card" style={{
              marginTop: 16,
              border: '1px solid var(--color-accent)',
              animation: 'fadeIn 0.3s ease',
            }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--color-accent)' }}>
                ✓ Gözlem Kaydedildi — ABC Analizi
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'A — Tetikleyici (Antecedent)', value: result.antecedent, color: '#f59e0b' },
                  { label: 'B — Davranış (Behavior)', value: result.behavior, color: '#3b82f6' },
                  { label: 'C — Sonuç (Consequence)', value: result.consequence, color: '#10b981' },
                ].map(item => (
                  <div key={item.label} style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: item.color + '15',
                    borderLeft: `3px solid ${item.color}`,
                  }}>
                    <div style={{ fontSize: '0.72rem', color: item.color, fontWeight: 700, marginBottom: 4 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.88rem' }}>
                      {item.value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belirtilmedi</span>}
                    </div>
                  </div>
                ))}
              </div>

              {result.structuring_latency_ms && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  AI analiz süresi: {(result.structuring_latency_ms / 1000).toFixed(1)}sn
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gözlem Geçmişi */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>
            {selectedStudentName
              ? `${selectedStudentName} — Gözlem Geçmişi`
              : 'Gözlem Geçmişi'}
          </h3>

          {historyLoading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0' }}>
              Henüz gözlem kaydı yok.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(obs => (
                <div
                  key={obs.id}
                  style={{
                    borderRadius: 8, overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Satır başlığı */}
                  <div
                    onClick={() => setExpandedId(expandedId === obs.id ? null : obs.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', cursor: 'pointer',
                      background: 'var(--bg-elevated)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                        background: (CATEGORY_COLORS[obs.category] || '#888') + '25',
                        color: CATEGORY_COLORS[obs.category] || '#888',
                        fontWeight: 600,
                      }}>
                        {obs.category}
                      </span>
                      <span style={{ fontSize: '0.85rem' }}>
                        {obs.summary.length > 55 ? obs.summary.slice(0, 55) + '…' : obs.summary}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(obs.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      {expandedId === obs.id
                        ? <ChevronUp size={14} color="var(--text-muted)" />
                        : <ChevronDown size={14} color="var(--text-muted)" />
                      }
                    </div>
                  </div>

                  {/* Genişletilmiş ABC detayı */}
                  {expandedId === obs.id && (
                    <div style={{ padding: '12px 14px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'A — Tetikleyici', value: obs.antecedent, color: '#f59e0b' },
                        { label: 'B — Davranış', value: obs.behavior, color: '#3b82f6' },
                        { label: 'C — Sonuç', value: obs.consequence, color: '#10b981' },
                      ].map(item => (
                        item.value && (
                          <div key={item.label} style={{
                            padding: '8px 12px', borderRadius: 6,
                            background: item.color + '12',
                            borderLeft: `3px solid ${item.color}`,
                          }}>
                            <div style={{ fontSize: '0.68rem', color: item.color, fontWeight: 700, marginBottom: 3 }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>{item.value}</div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
