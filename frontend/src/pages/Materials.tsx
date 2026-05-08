import { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, Image, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateMaterial, getStudentMaterials, type MaterialOut } from '../services/api';

const API_BASE = 'http://localhost:8000';
const API = `${API_BASE}/api/v1`;
const getToken = () => localStorage.getItem('access_token');

interface Student {
  id: string;
  name: string;
  disability_type: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Disleksi', otizm: 'Otizm Spektrum', zihin_yetersizligi: 'Zihinsel Yetersizlik',
  isitme: 'İşitme Yetersizliği', bedensel: 'Bedensel Yetersizlik', dehb: 'DEHB',
};

const PROGRESS_MESSAGES = [
  'Hikaye yazılıyor...',
  'Görsel promptlar oluşturuluyor...',
  'Görseller HuggingFace ile üretiliyor...',
  'PDF hazırlanıyor...',
  'Son dokunuşlar yapılıyor...',
];

export default function Materials() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [interestTopic, setInterestTopic] = useState('');
  const [sceneCount, setSceneCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [currentMaterial, setCurrentMaterial] = useState<MaterialOut | null>(null);
  const [history, setHistory] = useState<MaterialOut[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${API}/students/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      redirect: 'follow',
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.items || d || [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudent(list[0].id);
          loadHistory(list[0].id);
        }
      });
  }, []);

  const loadHistory = async (studentId: string) => {
    setHistoryLoading(true);
    try {
      const mats = await getStudentMaterials(studentId);
      setHistory(Array.isArray(mats) ? mats : []);
    } catch { /* sessiz */ }
    setHistoryLoading(false);
  };

  const startProgressAnimation = () => {
    let step = 0;
    setProgressPct(5);
    setProgressMsg(PROGRESS_MESSAGES[0]);
    progressTimer.current = setInterval(() => {
      step++;
      const pct = Math.min(5 + step * 18, 90);
      setProgressPct(pct);
      setProgressMsg(PROGRESS_MESSAGES[Math.min(step, PROGRESS_MESSAGES.length - 1)]);
    }, 6000);
  };

  const stopProgressAnimation = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgressPct(100);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !interestTopic.trim()) return;
    setGenerating(true);
    setError(null);
    setCurrentMaterial(null);
    setActiveScene(0);
    startProgressAnimation();

    try {
      const mat = await generateMaterial({
        student_id: selectedStudent,
        material_type: 'social_story',
        interest_topic: interestTopic.trim(),
        scene_count: sceneCount,
      });
      stopProgressAnimation();
      setCurrentMaterial(mat);
      loadHistory(selectedStudent);
    } catch (err: unknown) {
      stopProgressAnimation();
      setError(err instanceof Error ? err.message : 'Materyal üretilemedi');
    }
    setGenerating(false);
  };

  // Windows absolute path'i URL'ye çevir: C:\...\scene_1.png → /static/materials/{id}/scene_1.png
  const toStaticUrl = (imagePath: string | undefined): string | null => {
    if (!imagePath) return null;
    // Dosya adını çıkar
    const parts = imagePath.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1];
    const materialId = parts[parts.length - 2];
    return `${API_BASE}/static/materials/${materialId}/${filename}`;
  };

  const pdfUrl = (mat: MaterialOut) => {
    if (!mat.pdf_path) return null;
    const parts = mat.pdf_path.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1];
    const materialId = parts[parts.length - 2];
    return `${API_BASE}/static/materials/${materialId}/${filename}`;
  };

  const scenes = currentMaterial?.content?.scenes ?? [];
  const genMs = currentMaterial?.content?.metadata?.generation_time_ms;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>
          <Sparkles size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />
          Materyal Üretici
        </h2>
        <p>Öğrencinin ilgi alanına göre kişiselleştirilmiş sosyal öykü üretin</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        {/* Sol: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Materyal Parametreleri</h3>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Öğrenci */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Öğrenci
                </label>
                <select
                  value={selectedStudent}
                  onChange={e => {
                    setSelectedStudent(e.target.value);
                    setCurrentMaterial(null);
                    loadHistory(e.target.value);
                  }}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem',
                  }}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {DISABILITY_LABELS[s.disability_type] || s.disability_type}
                    </option>
                  ))}
                </select>
              </div>

              {/* İlgi Alanı */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  İlgi Alanı / Konu
                </label>
                <input
                  type="text"
                  value={interestTopic}
                  onChange={e => setInterestTopic(e.target.value)}
                  placeholder="Örn: Uzay ve Gezegenler, Dinozorlar, Kedi ve Köpekler"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Sahne Sayısı */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sahne Sayısı</span>
                  <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>{sceneCount}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={sceneCount}
                  onChange={e => setSceneCount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>2 sahne (~12sn)</span>
                  <span>6 sahne (~35sn)</span>
                </div>
              </div>

              {/* Materyal Türü */}
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--color-primary-light)15',
                border: '1px solid var(--color-primary-light)40',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                  <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Sosyal Öykü
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  HuggingFace FLUX.1 ile görsel üretimi dahil
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !selectedStudent || !interestTopic.trim()}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {generating ? (
                  <><div className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />Üretiliyor...</>
                ) : (
                  <><Sparkles size={16} />Materyal Üret</>
                )}
              </button>
            </form>
          </div>

          {/* Geçmiş Materyaller */}
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 14 }}>Önceki Materyaller</h3>
            {historyLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : history.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Henüz materyal yok.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.slice(0, 6).map(mat => (
                  <div
                    key={mat.id}
                    onClick={() => { setCurrentMaterial(mat); setActiveScene(0); }}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: currentMaterial?.id === mat.id ? 'var(--color-primary-light)15' : 'var(--bg-elevated)',
                      border: `1px solid ${currentMaterial?.id === mat.id ? 'var(--color-primary-light)' : 'var(--border-subtle)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{mat.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {mat.content?.scenes?.length ?? 0} sahne · {new Date(mat.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ: Sonuç Alanı */}
        <div>
          {/* Progress Bar */}
          {generating && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{progressMsg}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)' }}>{progressPct}%</span>
              </div>
              <div style={{
                height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))',
                  width: `${progressPct}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                HuggingFace FLUX.1-schnell ile görsel üretimi yapılıyor. Bu işlem 20-30 saniye sürebilir.
              </div>
            </div>
          )}

          {/* Hata */}
          {error && !generating && (
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {/* Materyal Görünümü */}
          {currentMaterial && !generating && (
            <div className="card">
              {/* Materyal Başlık */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{currentMaterial.title}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>
                      <Image size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {scenes.filter(s => s.image_path).length}/{scenes.length} görsel
                    </span>
                    {genMs && (
                      <span>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {(genMs / 1000).toFixed(1)}sn
                      </span>
                    )}
                  </div>
                </div>
                {pdfUrl(currentMaterial) && (
                  <a
                    href={pdfUrl(currentMaterial)!}
                    download
                    className="btn btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Download size={16} />
                    PDF İndir
                  </a>
                )}
              </div>

              {/* Sahne Navigasyonu */}
              {scenes.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <button
                      onClick={() => setActiveScene(s => Math.max(0, s - 1))}
                      disabled={activeScene === 0}
                      className="btn"
                      style={{ padding: '6px 12px' }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Sahne {activeScene + 1} / {scenes.length}
                    </div>
                    <button
                      onClick={() => setActiveScene(s => Math.min(scenes.length - 1, s + 1))}
                      disabled={activeScene === scenes.length - 1}
                      className="btn"
                      style={{ padding: '6px 12px' }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Aktif Sahne */}
                  {scenes[activeScene] && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: scenes[activeScene].image_path ? '1fr 1fr' : '1fr',
                      gap: 20,
                      minHeight: 280,
                    }}>
                      {/* Görsel */}
                      {scenes[activeScene].image_path && (
                        <div style={{
                          borderRadius: 12, overflow: 'hidden',
                          background: 'var(--bg-elevated)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <img
                            src={toStaticUrl(scenes[activeScene].image_path) ?? ''}
                            alt={`Sahne ${activeScene + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Metin */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        padding: 20,
                        background: 'var(--bg-elevated)',
                        borderRadius: 12,
                      }}>
                        <div style={{
                          fontSize: '0.7rem', color: 'var(--color-primary-light)',
                          fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1,
                        }}>
                          Sahne {scenes[activeScene].order}
                        </div>
                        <p style={{
                          fontSize: '1rem', lineHeight: 1.8,
                          color: 'var(--text-primary)', margin: 0,
                        }}>
                          {scenes[activeScene].text}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sahne Nokta Navigasyonu */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                    {scenes.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveScene(i)}
                        style={{
                          width: i === activeScene ? 24 : 8, height: 8,
                          borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: i === activeScene ? 'var(--color-primary-light)' : 'var(--border-subtle)',
                          transition: 'all 0.2s ease', padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Boş Durum */}
          {!currentMaterial && !generating && !error && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <Sparkles size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.4 }} />
              <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                Soldaki formu doldurun ve materyal üretin
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
                HuggingFace FLUX.1-schnell ile kişiselleştirilmiş görseller üretilir
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
