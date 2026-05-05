import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Trash2, Eye } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student {
  id: string; name: string; disability_type: string;
  grade_level: number; competency_notes?: string;
  is_active: boolean; created_at: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Disleksi', otizm: 'Otizm', zihin_yetersizligi: 'Zihinsel Yetersizlik',
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
        setError(err.detail || 'Hata oluştu');
      } else {
        setShowModal(false);
        setName(''); setNotes('');
        fetchStudents();
      }
    } catch { setError('Bağlantı hatası'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) return;
    await fetch(`${API}/students/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchStudents();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2><Users size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />Öğrenciler</h2>
          <p>Öğrenci profillerini oluşturun ve yönetin</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Yeni Öğrenci
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}>
          <div className="card" style={{ width: 440, position: 'relative' }}>
            <button className="btn-icon" onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 16, right: 16 }}><X size={18} /></button>
            <h3 style={{ marginBottom: 20 }}>Yeni Öğrenci Ekle</h3>
            {error && <div className="alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Öğrenci Adı</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Ali Yılmaz" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Engel Türü</label>
                  <select className="form-select" value={dtype} onChange={e => setDtype(e.target.value)}>
                    <option value="disleksi">Disleksi</option>
                    <option value="otizm">Otizm</option>
                    <option value="zihin_yetersizligi">Zihinsel Yetersizlik</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sınıf Seviyesi</label>
                  <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}. Sınıf</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Yetkinlik Notları</label>
                <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Harf-ses ilişkisinde zorluk yaşıyor..." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student List */}
      <div className="card">
        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={48} /></div>
            <h3>Henüz öğrenci yok</h3>
            <p>"Yeni Öğrenci" butonuna tıklayarak ilk profili oluşturun</p>
          </div>
        ) : (
          <table className="source-table">
            <thead>
              <tr><th>Ad</th><th>Engel Türü</th><th>Sınıf</th><th>Notlar</th><th></th></tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <span className={`badge ${s.disability_type === 'disleksi' ? 'badge-meb' : s.disability_type === 'otizm' ? 'badge-makale' : 'badge-yok'}`}>
                      {DISABILITY_LABELS[s.disability_type] || s.disability_type}
                    </span>
                  </td>
                  <td>{s.grade_level}. Sınıf</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.competency_notes || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => navigate(`/student/${s.id}`)} title="Dashboard">
                        <Eye size={14} color="var(--color-primary-light)" />
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(s.id)} title="Sil">
                        <Trash2 size={14} color="var(--color-danger)" />
                      </button>
                    </div>
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
