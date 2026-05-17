import { useState, useEffect, useRef, type FormEvent } from 'react';
import { getSources, uploadSource } from '../services/api';
import type { AcademicSource, SourceType } from '../types/index';
import { UploadCloud, CheckCircle2, Clock, XCircle, FileText, Trash2, RefreshCw, Database } from 'lucide-react';

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'MEB', label: 'Ministry of Education (MEB)' },
  { value: 'YOK_TEZ', label: 'Academic Thesis (YÖK)' },
  { value: 'MAKALE', label: 'Research Article' },
  { value: 'SAGLIK_BAK', label: 'Ministry of Health' },
];

const TYPE_COLORS: Record<string, string> = {
  MEB: '#3B82F6', YOK_TEZ: '#8B5CF6', MAKALE: '#2D936C', SAGLIK_BAK: '#F59E0B',
};

export default function Sources() {
  const [sources, setSources] = useState<AcademicSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('MAKALE');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = async () => {
    setLoading(true);
    try { const res = await getSources(); setSources(res.sources || []); }
    catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchSources(); }, []);

  const handleUpload = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setUploadError('');
    try {
      await uploadSource(file, title.trim(), sourceType);
      setFile(null); setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 5000);
      await fetchSources();
      // Poll indexing status: sources take time to vectorize
      setTimeout(() => fetchSources(), 5000);
      setTimeout(() => fetchSources(), 15000);
      setTimeout(() => fetchSources(), 30000);
    } catch (err: any) {
      console.error('[Sources] Upload error:', err);
      const msg = err?.detail || err?.message || String(err) || 'Upload failed. Check that the backend is running and the PDF is valid.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace('.pdf', ''));
    }
  };

  const filteredSources = filter === 'ALL' ? sources : sources.filter(s => s.source_type === filter);

  const card: React.CSSProperties = {
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  return (
    <main className="page-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Knowledge Base
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage and organize your academic sources and collections.
          </p>
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--color-accent-peach)', borderRadius: '12px', border: '1px solid var(--color-primary-dim)' }}>
            <div style={{ fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)' }}>{sources.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Sources</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: '#2D936C' }}>
              {sources.filter(s => s.is_indexed).length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Indexed</div>
          </div>
        </div>
      </div>

      {/* Banners */}
      {uploadSuccess && (
        <div style={{ padding: '12px 16px', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} style={{ color: '#065F46' }} />
          <span style={{ fontSize: '14px', color: '#065F46', fontWeight: 600 }}>Source uploaded and sent to vector indexer! Status will update shortly.</span>
        </div>
      )}
      {uploadError && (
        <div style={{ padding: '12px 16px', background: '#FDE8E8', border: '1px solid #FECACA', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <XCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: '#DC2626', fontWeight: 600 }}>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '2px' }}><XCircle size={16} /></button>
        </div>
      )}

      {/* Upload Zone */}
      <form onSubmit={handleUpload}>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : file ? 'var(--color-primary)' : 'var(--border-strong)'}`,
            borderRadius: '16px',
            background: dragOver || file ? 'var(--color-accent-peach)' : 'var(--bg-main)',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: file ? 'default' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: '32px',
          }}
        >
          <div style={{
            width: '64px', height: '64px', background: file ? 'var(--color-primary)' : 'var(--color-accent-peach)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            transition: 'background 0.2s',
          }}>
            <UploadCloud size={32} color={file ? '#fff' : 'var(--color-primary)'} />
          </div>

          {!file ? (
            <>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Drag and drop your files here
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                or click to browse (PDF only)
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'inline-flex', width: 'auto', padding: '12px 32px' }}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Upload Files
              </button>
            </>
          ) : (
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', margin: '0 auto' }}>
              {/* File selected state */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '16px', textAlign: 'left' }}>
                <FileText size={22} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button type="button" onClick={() => { setFile(null); setTitle(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <XCircle size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter document title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    autoFocus
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Type</label>
                  <select className="form-select" value={sourceType} onChange={e => setSourceType(e.target.value as SourceType)} style={{ width: '100%' }}>
                    {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !title.trim()}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                {uploading ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</> : 'Confirm Upload'}
              </button>
            </div>
          )}

          <input type="file" accept=".pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={e => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); if (!title) setTitle(f.name.replace('.pdf', '')); }
          }} />
        </div>
      </form>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['ALL', ...SOURCE_TYPES.map(t => t.value)].map(type => {
          const isActive = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '6px 14px', borderRadius: '999px', border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                background: isActive ? 'var(--color-primary)' : 'var(--bg-main)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {type === 'ALL' ? 'All Sources' : SOURCE_TYPES.find(t => t.value === type)?.label ?? type}
            </button>
          );
        })}
      </div>

      {/* Sources Table */}
      <div style={card}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'var(--color-primary)' }} />
            {filter === 'ALL' ? 'All Sources' : SOURCE_TYPES.find(t => t.value === filter)?.label}
            <span style={{ background: 'var(--color-accent-peach)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', marginLeft: '4px' }}>
              {filteredSources.length}
            </span>
          </h3>
          <button onClick={fetchSources} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-alt)' }}>
              {['Document Name', 'Type', 'Pages', 'Upload Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
                Loading sources...
              </td></tr>
            )}
            {!loading && filteredSources.map((src, i) => {
              const typeColor = TYPE_COLORS[src.source_type] ?? 'var(--color-primary)';
              return (
                <tr key={src.id} style={{ borderTop: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-alt)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${typeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={18} style={{ color: typeColor }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{src.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{src.file_name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40` }}>
                      {src.source_type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {src.page_count ?? '—'}
                  </td>
                  <td style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {new Date(src.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {src.is_indexed ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' }}>
                        <CheckCircle2 size={12} /> Indexed
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                        <Clock size={12} /> Processing
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredSources.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                  <Database size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No sources uploaded yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
