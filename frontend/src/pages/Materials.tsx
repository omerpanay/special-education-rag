import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Download, ImageIcon, BookOpen, Clock, ChevronLeft, ChevronRight,
  LayoutTemplate, History, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { generateMaterial, getStudentMaterials, type MaterialOut } from '../services/api';

const API_BASE = 'http://localhost:8000';
const API = `${API_BASE}/api/v1`;
const getToken = () => localStorage.getItem('access_token');

interface Student { id: string; name: string; disability_type: string; }

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia', otizm: 'Autism Spectrum',
  zihin_yetersizligi: 'Intellectual Disability', isitme: 'Hearing Impairment',
  bedensel: 'Physical Disability', dehb: 'ADHD',
};

const PROGRESS_MESSAGES = [
  'Initializing Agentic Pipeline...',
  'Writer Agent: Generating scene-by-scene narrative...',
  'Prompt Agent: Converting scenes to visual descriptions...',
  'Image Agent: Synthesizing illustrations via FLUX.1...',
  'PDF Builder: Assembling final material...',
];

export default function Materials() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
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
    fetch(`${API}/students/`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.items || d || [];
        setStudents(list);
        if (list.length > 0) { setSelectedStudent(list[0].id); loadHistory(list[0].id); }
      });
  }, []);

  const loadHistory = async (studentId: string) => {
    setHistoryLoading(true);
    try { const mats = await getStudentMaterials(studentId); setHistory(Array.isArray(mats) ? mats : []); }
    catch { /* silent */ }
    setHistoryLoading(false);
  };

  const startProgress = () => {
    let step = 0; setProgressPct(5); setProgressMsg(PROGRESS_MESSAGES[0]);
    progressTimer.current = setInterval(() => {
      step++; const pct = Math.min(5 + step * 18, 90);
      setProgressPct(pct);
      setProgressMsg(PROGRESS_MESSAGES[Math.min(step, PROGRESS_MESSAGES.length - 1)]);
    }, 6000);
  };
  const stopProgress = () => { if (progressTimer.current) clearInterval(progressTimer.current); setProgressPct(100); };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !interestTopic.trim()) return;
    setGenerating(true); setError(null); setCurrentMaterial(null); setActiveScene(0);
    startProgress();
    try {
      const mat = await generateMaterial({ student_id: selectedStudent, material_type: 'social_story', interest_topic: interestTopic.trim(), scene_count: sceneCount });
      stopProgress(); setCurrentMaterial(mat); loadHistory(selectedStudent);
    } catch (err: unknown) { stopProgress(); setError(err instanceof Error ? err.message : 'Material generation failed'); }
    setGenerating(false);
  };

  const toStaticUrl = (imagePath: string | undefined): string | null => {
    if (!imagePath) return null;
    const parts = imagePath.replace(/\\/g, '/').split('/');
    return `${API_BASE}/static/materials/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  };
  const pdfUrl = (mat: MaterialOut) => {
    if (!mat.pdf_path) return null;
    const parts = mat.pdf_path.replace(/\\/g, '/').split('/');
    return `${API_BASE}/static/materials/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  };

  const scenes = currentMaterial?.content?.scenes ?? [];
  const genMs = currentMaterial?.content?.metadata?.generation_time_ms;

  const card: React.CSSProperties = {
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Material Generator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Generate personalized, AI-driven social stories and visual aids tailored to each student's specific interests.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>

        {/* LEFT: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={card}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} /> Generation Parameters
            </h3>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Student */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Student Profile
                </label>
                <select
                  value={selectedStudent}
                  onChange={e => { setSelectedStudent(e.target.value); setCurrentMaterial(null); loadHistory(e.target.value); }}
                  className="form-select"
                  style={{ width: '100%' }}
                >
                  {students.length === 0 && <option value="">No students available</option>}
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {DISABILITY_LABELS[s.disability_type] || s.disability_type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interest Topic */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Interest Topic
                </label>
                <input
                  type="text"
                  value={interestTopic}
                  onChange={e => setInterestTopic(e.target.value)}
                  placeholder="e.g. Space & Planets, Dinosaurs, Trains..."
                  className="form-input"
                  style={{ width: '100%' }}
                  minLength={2}
                  maxLength={100}
                />
              </div>

              {/* Scene Count */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Narrative Length
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{sceneCount} Scenes</span>
                </div>
                <input
                  type="range" min={2} max={6} value={sceneCount}
                  onChange={e => setSceneCount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Short (~15s)</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Long (~45s)</span>
                </div>
              </div>

              {/* Material Type Badge */}
              <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-accent-peach)', border: '1px solid var(--color-primary-dim)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LayoutTemplate size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>Social Story Format</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    AI narrative from Llama 3.1 + illustrations via HuggingFace FLUX.1
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !selectedStudent || !interestTopic.trim()}
                className="btn-primary"
                style={{ marginTop: '4px' }}
              >
                {generating ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={18} /> Generate Material</>}
              </button>
            </form>
          </div>

          {/* History */}
          <div style={card}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={16} style={{ color: 'var(--color-primary)' }} /> Previous Materials
            </h3>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : history.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '16px', fontStyle: 'italic' }}>
                No materials yet for this student.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.slice(0, 6).map(mat => (
                  <button
                    key={mat.id}
                    onClick={() => { setCurrentMaterial(mat); setActiveScene(0); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: '10px',
                      border: `1px solid ${currentMaterial?.id === mat.id ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                      background: currentMaterial?.id === mat.id ? 'var(--color-accent-peach)' : 'var(--bg-surface-alt)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mat.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ImageIcon size={10} /> {mat.content?.scenes?.length ?? 0} scenes
                      </span>
                      <span>{new Date(mat.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Progress */}
          {generating && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    🚀 Pipeline Active
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-primary)', margin: 0 }}>{progressMsg}</p>
                </div>
                <span style={{ fontFamily: 'Outfit', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-surface-alt)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-primary)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ padding: '12px', background: 'var(--color-accent-peach)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Clock size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Image synthesis via FLUX.1 requires compute. Please allow 20-30 seconds per scene.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !generating && (
            <div style={{ padding: '16px', background: '#FDE8E8', border: '1px solid #FECACA', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '14px', marginBottom: '4px' }}>Generation Failed</div>
                <p style={{ fontSize: '13px', color: 'var(--color-danger)', margin: 0, opacity: 0.85 }}>{error}</p>
              </div>
            </div>
          )}

          {/* Material Viewer */}
          {currentMaterial && !generating && (
            <div style={card}>
              {/* Title bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <h2 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    {currentMaterial.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ImageIcon size={12} /> {scenes.filter(s => s.image_path).length}/{scenes.length} Images
                    </span>
                    {genMs && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} /> {(genMs / 1000).toFixed(1)}s generation
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2D936C' }}>
                      <CheckCircle2 size={12} /> Ready
                    </span>
                  </div>
                </div>
                {pdfUrl(currentMaterial) && (
                  <a
                    href={pdfUrl(currentMaterial)!}
                    download
                    style={{
                      padding: '10px 18px', background: 'var(--color-primary)', color: '#fff',
                      borderRadius: '9999px', textDecoration: 'none', display: 'flex', alignItems: 'center',
                      gap: '8px', fontSize: '13px', fontWeight: 600, flexShrink: 0, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                  >
                    <Download size={16} /> Download PDF
                  </a>
                )}
              </div>

              {/* Scene Viewer */}
              {scenes.length > 0 && (
                <>
                  {scenes[activeScene] && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: scenes[activeScene].image_path ? '1fr 1fr' : '1fr',
                      gap: '20px', minHeight: '300px', marginBottom: '20px',
                    }}>
                      {scenes[activeScene].image_path && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}>
                          <img
                            src={toStaticUrl(scenes[activeScene].image_path) ?? ''}
                            alt={`Scene ${activeScene + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div style={{ padding: '24px', background: 'var(--bg-surface-alt)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ padding: '4px 12px', background: 'var(--color-accent-peach)', color: 'var(--color-primary)', borderRadius: '999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start', marginBottom: '16px' }}>
                          Scene {scenes[activeScene].order}
                        </span>
                        <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                          {scenes[activeScene].text}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => setActiveScene(s => Math.max(0, s - 1))} disabled={activeScene === 0} className="btn-outline" style={{ padding: '8px 14px', opacity: activeScene === 0 ? 0.4 : 1 }}>
                      <ChevronLeft size={18} />
                    </button>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {scenes.map((_, i) => (
                        <button key={i} onClick={() => setActiveScene(i)} style={{
                          width: i === activeScene ? '28px' : '8px', height: '8px', borderRadius: '4px', border: 'none', padding: 0,
                          background: i === activeScene ? 'var(--color-primary)' : 'var(--border-strong)',
                          cursor: 'pointer', transition: 'all 0.3s',
                        }} />
                      ))}
                    </div>
                    <button onClick={() => setActiveScene(s => Math.min(scenes.length - 1, s + 1))} disabled={activeScene === scenes.length - 1} className="btn-outline" style={{ padding: '8px 14px', opacity: activeScene === scenes.length - 1 ? 0.4 : 1 }}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Empty State */}
          {!currentMaterial && !generating && !error && (
            <div style={{ ...card, padding: '64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '360px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-accent-peach)', border: '2px dashed var(--color-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <BookOpen size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                No Material Selected
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '360px', margin: 0, lineHeight: 1.6 }}>
                Configure the generation parameters on the left and click "Generate Material" to create an AI-powered social story.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
