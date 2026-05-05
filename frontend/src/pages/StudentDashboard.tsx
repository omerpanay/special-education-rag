import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, ArrowLeft, FileText, MessageSquare,
  Shield, ShieldCheck, ClipboardList, TrendingUp,
} from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface Student {
  id: string; name: string; disability_type: string;
  grade_level: number; competency_notes?: string;
  is_active: boolean; created_at: string;
}

interface ConsentStatus {
  data_processing: boolean;
  ai_analysis: boolean;
  game_participation: boolean;
  granted_at?: string;
}

interface IEPSummary {
  id: string; version: number; status: string;
  created_at: string;
}

interface ConvSummary {
  id: string; title: string; message_count: number;
  created_at: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Disleksi', otizm: 'Otizm Spektrum Bozukluğu',
  zihin_yetersizligi: 'Zihinsel Yetersizlik',
  isitme: 'İşitme Yetersizliği', bedensel: 'Bedensel Yetersizlik',
  dehb: 'DEHB',
};

export default function StudentDashboard() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [ieps, setIeps] = useState<IEPSummary[]>([]);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) fetchAll(studentId);
  }, [studentId]);

  const fetchAll = async (id: string) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };

    try {
      const [stuRes, conRes, iepRes, convRes] = await Promise.all([
        fetch(`${API}/students/${id}`, { headers }),
        fetch(`${API}/consent/${id}`, { headers }),
        fetch(`${API}/iep/student/${id}`, { headers }),
        fetch(`${API}/conversations`, { headers }),
      ]);

      if (stuRes.ok) setStudent(await stuRes.json());
      if (conRes.ok) setConsent(await conRes.json());
      if (iepRes.ok) {
        const data = await iepRes.json();
        setIeps(data.items || []);
      }
      if (convRes.ok) {
        const data = await convRes.json();
        // Sadece bu öğrenciyle ilgili konuşmaları filtrele
        setConversations(data.items || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const toggleConsent = async (consentType: string, currentValue: boolean) => {
    if (!studentId) return;
    const endpoint = currentValue ? 'revoke' : 'grant';
    try {
      const res = await fetch(`${API}/consent/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          consent_types: [consentType],
        }),
      });
      if (res.ok) setConsent(await res.json());
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="card empty-state">
        <h3>Öğrenci bulunamadı</h3>
        <Link to="/students" className="btn btn-primary" style={{ marginTop: 12 }}>
          <ArrowLeft size={16} /> Öğrencilere Dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/students" style={{
            fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8,
          }}>
            <ArrowLeft size={14} /> Öğrencilere Dön
          </Link>
          <h2>
            <User size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-light)' }} />
            {student.name}
          </h2>
          <p>{DISABILITY_LABELS[student.disability_type] || student.disability_type} · {student.grade_level}. Sınıf</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <ClipboardList size={28} color="var(--color-primary-light)" />
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4 }}>{ieps.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BEP Taslağı</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <MessageSquare size={28} color="var(--color-accent)" />
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4 }}>{conversations.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Konuşma</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <TrendingUp size={28} color="var(--color-warning)" />
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4 }}>—</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Oyun Oturumu</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Profil Kartı */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <User size={18} /> Öğrenci Profili
          </h3>
          <table className="source-table">
            <tbody>
              <tr><td style={{ fontWeight: 600, width: '40%' }}>Ad-Soyad</td><td>{student.name}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Eğitsel Tanı</td><td>{DISABILITY_LABELS[student.disability_type]}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Sınıf</td><td>{student.grade_level}. Sınıf</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Durum</td><td>{student.is_active ? '✅ Aktif' : '⏸ Pasif'}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Kayıt Tarihi</td><td>{new Date(student.created_at).toLocaleDateString('tr-TR')}</td></tr>
              {student.competency_notes && (
                <tr><td style={{ fontWeight: 600 }}>Yetkinlik Notları</td><td>{student.competency_notes}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* KVKK Rıza Kartı */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={18} /> KVKK Rıza Durumu
          </h3>
          {consent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'data_processing', label: 'Kişisel Veri İşleme', desc: 'Öğrenci verilerinin platform üzerinde işlenmesi' },
                { key: 'ai_analysis', label: 'AI Analizi', desc: 'Yapay zeka ile performans analizi' },
                { key: 'game_participation', label: 'Oyun Katılımı', desc: 'Eğitsel oyun oturumlarına katılım' },
              ].map(item => (
                <div key={item.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {(consent as any)[item.key] ? (
                        <ShieldCheck size={14} color="var(--color-accent)" />
                      ) : (
                        <Shield size={14} color="var(--text-muted)" />
                      )}
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={(consent as any)[item.key]}
                      onChange={() => toggleConsent(item.key, (consent as any)[item.key])}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: 12,
                      background: (consent as any)[item.key] ? 'var(--color-accent)' : 'var(--bg-card)',
                      border: '2px solid var(--border-subtle)', transition: 'all 0.2s ease',
                    }}>
                      <span style={{
                        position: 'absolute', top: 2, left: (consent as any)[item.key] ? 22 : 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#fff', transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </span>
                  </label>
                </div>
              ))}
              {consent.granted_at && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Son güncelleme: {new Date(consent.granted_at).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Henüz rıza kaydı yok.</div>
          )}
        </div>

        {/* BEP Taslakları */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={18} /> BEP Taslakları
          </h3>
          {ieps.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Henüz BEP taslağı yok.
              <Link to="/iep" style={{ marginLeft: 8, color: 'var(--color-primary-light)' }}>Üret →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ieps.map(iep => (
                <div key={iep.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 6,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>BEP v{iep.version}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                      {new Date(iep.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, color: '#fff',
                    background: iep.status === 'finalized' ? 'var(--color-accent)' :
                      iep.status === 'reviewed' ? 'var(--color-primary-light)' : 'var(--color-warning)',
                  }}>
                    {iep.status === 'draft' ? 'Taslak' : iep.status === 'reviewed' ? 'İncelendi' : 'Kesinleşti'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Konuşma Geçmişi */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MessageSquare size={18} /> Son Konuşmalar
          </h3>
          {conversations.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Henüz konuşma yok.
              <Link to="/query" style={{ marginLeft: 8, color: 'var(--color-primary-light)' }}>Soru Sor →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conversations.slice(0, 5).map(conv => (
                <div key={conv.id} style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {conv.title.length > 60 ? conv.title.slice(0, 60) + '...' : conv.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {conv.message_count} mesaj · {new Date(conv.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
