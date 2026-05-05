import { useState, useEffect, type FormEvent } from 'react';
import { FileText, Sparkles, ChevronDown, ChevronRight, User, Download, RefreshCw } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student {
  id: string; name: string; disability_type: string;
  grade_level: number; competency_notes?: string;
}

interface IEPDraft {
  id: string;
  student_id: string;
  student_name: string;
  content: any;
  version: number;
  status: string;
  teacher_notes?: string;
  created_at: string;
  updated_at: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Disleksi', otizm: 'Otizm', zihin_yetersizligi: 'Zihinsel Yetersizlik',
  isitme: 'İşitme Yetersizliği', bedensel: 'Bedensel Yetersizlik', dehb: 'DEHB',
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: 'Taslak', color: 'var(--color-warning)' },
  reviewed: { text: 'İncelendi', color: 'var(--color-primary-light)' },
  finalized: { text: 'Kesinleşti', color: 'var(--color-accent)' },
};

export default function IEPGenerator() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentDraft, setCurrentDraft] = useState<IEPDraft | null>(null);
  const [drafts, setDrafts] = useState<IEPDraft[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    student_info: true, performance: true, plan: true, decisions: false,
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/students`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.items || []);
      }
    } catch { /* silent */ }
  };

  const fetchDrafts = async (studentId: string) => {
    try {
      const res = await fetch(`${API}/iep/student/${studentId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.items || []);
      }
    } catch { /* silent */ }
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setCurrentDraft(null);
    if (id) fetchDrafts(id);
    else setDrafts([]);
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API}/iep/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          student_id: selectedStudentId,
          additional_notes: additionalNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || 'BEP üretilirken hata oluştu');
      } else {
        const draft: IEPDraft = await res.json();
        setCurrentDraft(draft);
        fetchDrafts(selectedStudentId);
      }
    } catch {
      setError('Bağlantı hatası');
    }
    setGenerating(false);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div>
      <div className="page-header">
        <h2>
          <FileText size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />
          BEP Taslağı Üretici
        </h2>
        <p>AI destekli MEB formatında Bireyselleştirilmiş Eğitim Programı taslağı</p>
      </div>

      <div className="query-layout">
        {/* Sol Panel: Form */}
        <div className="card query-form-card">
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label htmlFor="bepStudentSelect">
                <User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Öğrenci Seçin
              </label>
              <select id="bepStudentSelect" className="form-select"
                value={selectedStudentId} onChange={e => handleStudentChange(e.target.value)} required>
                <option value="">Öğrenci seçiniz...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {DISABILITY_LABELS[s.disability_type] || s.disability_type} — {s.grade_level}. Sınıf
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Öğrenci Profili</div>
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>{selectedStudent.name}</strong> · {selectedStudent.grade_level}. Sınıf ·{' '}
                  <span className="badge badge-meb">{DISABILITY_LABELS[selectedStudent.disability_type]}</span>
                </div>
                {selectedStudent.competency_notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    📝 {selectedStudent.competency_notes}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="bepNotes">Ek Notlar (opsiyonel)</label>
              <textarea id="bepNotes" className="form-textarea" rows={3}
                value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Örn: Görsel materyallerle daha iyi öğreniyor, ev ortamında pekiştirme gerekiyor..." />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={generating || !selectedStudentId}>
              <Sparkles size={16} />
              {generating ? 'BEP Taslağı Üretiliyor...' : 'BEP Taslağı Üret'}
            </button>
          </form>

          {/* Önceki Taslaklar */}
          {drafts.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                📋 Önceki BEP Taslakları ({drafts.length})
              </h4>
              {drafts.map(d => (
                <div key={d.id}
                  onClick={() => setCurrentDraft(d)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                    background: currentDraft?.id === d.id ? 'var(--bg-elevated)' : 'transparent',
                    border: currentDraft?.id === d.id ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>v{d.version}</span>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4,
                      background: STATUS_LABELS[d.status]?.color || 'gray', color: '#fff',
                    }}>
                      {STATUS_LABELS[d.status]?.text || d.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(d.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sağ Panel: BEP Görünümü */}
        <div>
          {generating && (
            <div className="card">
              <div className="loading-container">
                <div className="spinner" />
                <p>Akademik kaynaklar analiz ediliyor ve BEP taslağı üretiliyor...</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bu işlem 15-30 saniye sürebilir.</p>
              </div>
            </div>
          )}

          {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {currentDraft && !generating && (
            <div className="query-answer">
              {/* Başlık */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>BİREYSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      Versiyon {currentDraft.version} · {new Date(currentDraft.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon" onClick={handlePrint} title="Yazdır">
                      <Download size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => handleGenerate({ preventDefault: () => {} } as FormEvent)} title="Yeniden Üret">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bölüm I: Öğrenci Bilgileri */}
              {currentDraft.content.student_info && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div onClick={() => toggleSection('student_info')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedSections.student_info ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h4 style={{ margin: 0 }}>I — Öğrenci Bilgileri</h4>
                  </div>
                  {expandedSections.student_info && (
                    <table className="source-table" style={{ marginTop: 12 }}>
                      <tbody>
                        <tr><td style={{ fontWeight: 600, width: '40%' }}>Ad-Soyad</td><td>{currentDraft.content.student_info.name}</td></tr>
                        <tr><td style={{ fontWeight: 600 }}>Sınıf</td><td>{currentDraft.content.student_info.grade_level}. Sınıf</td></tr>
                        <tr><td style={{ fontWeight: 600 }}>Eğitsel Tanı</td><td>{currentDraft.content.student_info.educational_diagnosis || currentDraft.content.student_info.disability_type}</td></tr>
                        {currentDraft.content.student_info.environment_adjustments && (
                          <tr><td style={{ fontWeight: 600 }}>Ortam Düzenlemeleri</td><td>{currentDraft.content.student_info.environment_adjustments}</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Bölüm II: Eğitsel Performans */}
              {currentDraft.content.performance_assessment && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div onClick={() => toggleSection('performance')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedSections.performance ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h4 style={{ margin: 0 }}>II — Eğitsel Performans Formu</h4>
                  </div>
                  {expandedSections.performance && (
                    <div style={{ marginTop: 12 }}>
                      {currentDraft.content.performance_assessment.development_history && (
                        <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 12 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Gelişim Öyküsü</div>
                          <div style={{ fontSize: '0.9rem' }}>{currentDraft.content.performance_assessment.development_history}</div>
                        </div>
                      )}
                      <table className="source-table">
                        <thead>
                          <tr><th>Gelişim Alanı / Ders</th><th>Performans Düzeyi</th></tr>
                        </thead>
                        <tbody>
                          {(currentDraft.content.performance_assessment.areas || []).map((area: any, i: number) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, minWidth: 160 }}>{area.area_name}</td>
                              <td>{area.performance_level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Bölüm III: Eğitim Planı */}
              {currentDraft.content.education_plan && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div onClick={() => toggleSection('plan')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedSections.plan ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h4 style={{ margin: 0 }}>III — Bireyselleştirilmiş Eğitim Planı</h4>
                  </div>
                  {expandedSections.plan && (
                    <div style={{ marginTop: 12 }}>
                      {(currentDraft.content.education_plan || []).map((plan: any, pi: number) => (
                        <div key={pi} style={{
                          marginBottom: 16, padding: 16, borderRadius: 8,
                          border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary-light)', marginBottom: 8 }}>
                            {plan.development_area}
                          </div>
                          <div style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                            <strong>Uzun Dönemli Amaç:</strong> {plan.long_term_goal}
                          </div>

                          {(plan.short_term_goals || []).map((goal: any, gi: number) => (
                            <div key={gi} style={{
                              marginBottom: 12, padding: 12, borderRadius: 6,
                              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                            }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
                                Kısa Dönemli Amaç {gi + 1}: {goal.goal}
                              </div>
                              <table className="source-table" style={{ fontSize: '0.8rem' }}>
                                <tbody>
                                  {goal.behaviors?.length > 0 && (
                                    <tr><td style={{ fontWeight: 600, width: '30%' }}>Davranışlar</td><td>{goal.behaviors.join(', ')}</td></tr>
                                  )}
                                  <tr><td style={{ fontWeight: 600 }}>Ölçüt</td><td>{goal.criterion}</td></tr>
                                  {goal.methods?.length > 0 && (
                                    <tr><td style={{ fontWeight: 600 }}>Yöntem/Teknik</td><td>{goal.methods.join(', ')}</td></tr>
                                  )}
                                  {goal.materials?.length > 0 && (
                                    <tr><td style={{ fontWeight: 600 }}>Materyaller</td><td>{goal.materials.join(', ')}</td></tr>
                                  )}
                                  <tr><td style={{ fontWeight: 600 }}>Değerlendirme</td><td>{goal.evaluation_method} — {goal.evaluation_dates}</td></tr>
                                </tbody>
                              </table>
                            </div>
                          ))}

                          {plan.environment_adjustments && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                              🏫 Ortam Düzenlemesi: {plan.environment_adjustments}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bölüm IV: BEP Birim Kararları */}
              {currentDraft.content.unit_decisions && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div onClick={() => toggleSection('decisions')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedSections.decisions ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h4 style={{ margin: 0 }}>IV — BEP Geliştirme Birim Kararları</h4>
                  </div>
                  {expandedSections.decisions && (
                    <div style={{ marginTop: 12 }}>
                      {(currentDraft.content.unit_decisions.school_services || []).length > 0 && (
                        <table className="source-table" style={{ marginBottom: 12 }}>
                          <thead>
                            <tr><th>Hizmet Türü</th><th>Alan/Ders</th><th>Haftalık Süre</th><th>Sorumlu</th></tr>
                          </thead>
                          <tbody>
                            {currentDraft.content.unit_decisions.school_services.map((s: any, i: number) => (
                              <tr key={i}>
                                <td>{s.service_type}</td>
                                <td>{s.area}</td>
                                <td>{s.weekly_hours} saat</td>
                                <td>{s.responsible}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div style={{ fontSize: '0.85rem' }}>
                        <p><strong>Aile Bilgilendirme Sıklığı:</strong> {currentDraft.content.unit_decisions.family_info_frequency}</p>
                        <p><strong>Bilgilendirme Yöntemi:</strong> {currentDraft.content.unit_decisions.family_info_method}</p>
                        <p><strong>Aile Eğitimi:</strong> {currentDraft.content.unit_decisions.family_education ? 'Evet' : 'Hayır'}</p>
                        {currentDraft.content.unit_decisions.family_education_method && (
                          <p><strong>Aile Eğitimi Yöntemi:</strong> {currentDraft.content.unit_decisions.family_education_method}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!generating && !currentDraft && !error && (
            <div className="card empty-state">
              <div className="empty-icon"><FileText size={48} /></div>
              <h3>BEP Taslağı Üretin</h3>
              <p>Soldaki formdan öğrenci seçip "BEP Taslağı Üret" butonuna basın.<br />
                AI, MEB formatına uygun bireyselleştirilmiş eğitim programı taslağı oluşturacaktır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
