import { useState, useEffect, useRef, type FormEvent } from 'react';
import { getSources, uploadSource } from '../services/api';
import type { AcademicSource, SourceType } from '../types';
import { Upload, FileText, CheckCircle, RefreshCw } from 'lucide-react';

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'MEB', label: 'Ministry of Education Document' },
  { value: 'YOK_TEZ', label: 'Academic Thesis' },
  { value: 'MAKALE', label: 'Research Article' },
  { value: 'SAGLIK_BAK', label: 'Ministry of Health' },
];

export default function Sources() {
  const [sources, setSources] = useState<AcademicSource[]>([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('MAKALE');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await getSources();
      setSources(res.sources || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchSources(); }, []);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);
    setUploadMsg('');
    try {
      await uploadSource(file, title, sourceType);
      setUploadMsg('✅ File uploaded and indexed successfully!');
      setFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSources();
    } catch (err) {
      setUploadMsg(`❌ ${err instanceof Error ? err.message : 'Upload failed'}`);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace('.pdf', ''));
    }
  };

  const getBadge = (type: string) => {
    const map: Record<string, string> = { MEB: 'badge-meb', MAKALE: 'badge-makale', YOK_TEZ: 'badge-yok', SAGLIK_BAK: 'badge-saglik' };
    return map[type] || 'badge-makale';
  };

  return (
    <div>
      <div className="page-header">
        <h2><FileText size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />Source Management</h2>
        <p>Upload and manage academic PDF documents for the RAG pipeline</p>
      </div>

      {/* Upload */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleUpload}>
          <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}>
            <Upload size={36} className="upload-icon" />
            <p>{file ? `📄 ${file.name}` : 'Drag & drop a PDF file here, or click to select'}</p>
            <input ref={fileInputRef} type="file" accept=".pdf" hidden
              onChange={e => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace('.pdf', ''));
              }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, marginTop: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="srcTitle">Source Title</label>
              <input id="srcTitle" className="form-input" placeholder="Source title" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="srcType">Source Type</label>
              <select id="srcType" className="form-select" value={sourceType} onChange={e => setSourceType(e.target.value as SourceType)}>
                {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={!file || !title || uploading}>
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload & Index'}
            </button>
            {uploadMsg && <span style={{ fontSize: '0.85rem' }}>{uploadMsg}</span>}
          </div>
        </form>
      </div>

      {/* Source List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem' }}>Indexed Sources ({sources.length})</h3>
          <button className="btn-icon" onClick={fetchSources} title="Refresh"><RefreshCw size={16} /></button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : sources.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FileText size={48} /></div>
            <h3>No sources yet</h3>
            <p>Upload a PDF above to get started</p>
          </div>
        ) : (
          <table className="source-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Pages</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.title}</td>
                  <td><span className={`badge ${getBadge(s.source_type)}`}>{s.source_type}</span></td>
                  <td>{s.page_count ?? '-'}</td>
                  <td>
                    {s.is_indexed
                      ? <span className="badge badge-indexed"><CheckCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Indexed</span>
                      : <span className="badge badge-processing">Processing</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
