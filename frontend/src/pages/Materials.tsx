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
  disleksi: 'Dyslexia',
  otizm: 'Autism Spectrum',
  zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment',
  bedensel: 'Physical Disability',
  dehb: 'ADHD',
};

const PROGRESS_MESSAGES = [
  'Writing the story...',
  'Generating visual prompts...',
  'Creating images with HuggingFace FLUX.1...',
  'Building the PDF...',
  'Final touches...',
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
    } catch { /* silent */ }
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
      setError(err instanceof Error ? err.message : 'Material generation failed');
    }
    setGenerating(false);
  };

  // Convert Windows absolute path to static URL
  const toStaticUrl = (imagePath: string | undefined): string | null => {
    if (!imagePath) return null;
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
          Material Generator
        </h2>
        <p>Generate personalized social stories based on each student's interests</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        {/* Left: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Generation Parameters</h3>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Student */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Student
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

              {/* Interest Topic */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Interest Topic
                </label>
                <input
                  type="text"
                  value={interestTopic}
                  onChange={e => setInterestTopic(e.target.value)}
                  placeholder="E.g.: Space & Planets, Dinosaurs, Animals & Nature"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Scene Count */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Number of Scenes</span>
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
                  <span>2 scenes (~12s)</span>
                  <span>6 scenes (~35s)</span>
                </div>
              </div>

              {/* Material Type Badge */}
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--color-primary-light)15',
                border: '1px solid var(--color-primary-light)40',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                  <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Social Story
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Includes AI-generated illustrations via HuggingFace FLUX.1
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !selectedStudent || !interestTopic.trim()}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {generating ? (
                  <><div className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />Generating...</>
                ) : (
                  <><Sparkles size={16} />Generate Material</>
                )}
              </button>
            </form>
          </div>

          {/* Previous Materials */}
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 14 }}>Previous Materials</h3>
            {historyLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : history.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No materials generated yet.</div>
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
                      {mat.content?.scenes?.length ?? 0} scenes · {new Date(mat.created_at).toLocaleDateString('en-US')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Result Area */}
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
                Generating illustrations with HuggingFace FLUX.1-schnell. This may take 20–30 seconds.
              </div>
            </div>
          )}

          {/* Error */}
          {error && !generating && (
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
              background: 'rgba(224,122,95,0.1)', border: '1px solid rgba(224,122,95,0.3)',
              color: '#E07A5F', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {/* Material Viewer */}
          {currentMaterial && !generating && (
            <div className="card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{currentMaterial.title}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>
                      <Image size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {scenes.filter(s => s.image_path).length}/{scenes.length} images
                    </span>
                    {genMs && (
                      <span>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {(genMs / 1000).toFixed(1)}s
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
                    Download PDF
                  </a>
                )}
              </div>

              {/* Scene Navigation */}
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
                      Scene {activeScene + 1} / {scenes.length}
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

                  {/* Active Scene */}
                  {scenes[activeScene] && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: scenes[activeScene].image_path ? '1fr 1fr' : '1fr',
                      gap: 20,
                      minHeight: 280,
                    }}>
                      {scenes[activeScene].image_path && (
                        <div style={{
                          borderRadius: 12, overflow: 'hidden',
                          background: 'var(--bg-elevated)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <img
                            src={toStaticUrl(scenes[activeScene].image_path) ?? ''}
                            alt={`Scene ${activeScene + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

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
                          Scene {scenes[activeScene].order}
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

                  {/* Dot Navigation */}
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

          {/* Empty State */}
          {!currentMaterial && !generating && !error && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <Sparkles size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.4 }} />
              <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                Fill in the form and generate your first material
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Personalized illustrations generated with HuggingFace FLUX.1-schnell
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
