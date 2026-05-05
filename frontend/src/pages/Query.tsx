import { useState, useEffect, useRef, type FormEvent } from 'react';
import { askQuestion } from '../services/api';
import type { QueryResponse } from '../types';
import {
  Send, BookOpen, Clock, Sparkles, Plus, MessageSquare, Trash2,
  ThumbsUp, ThumbsDown, User, Bot, GraduationCap,
} from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface StudentOption {
  id: string; name: string; disability_type: string; grade_level: number;
}
interface ChatMessage {
  role: 'user' | 'assistant'; content: string;
  citations?: QueryResponse['citations']; is_fallback?: boolean;
  total_latency_ms?: number; response_id?: string;
}
interface ConversationSummary {
  id: string; title: string; student_id?: string; student_name?: string;
  message_count: number; created_at: string;
}

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Disleksi', otizm: 'Otizm', zihin_yetersizligi: 'Zihinsel Yetrs.',
  isitme: 'İşitme Yetrs.', bedensel: 'Bedensel Yetrs.', dehb: 'DEHB',
};
const DISABILITY_EMOJI: Record<string, string> = {
  disleksi: '📖', otizm: '🧩', zihin_yetersizligi: '🧠',
  isitme: '👂', bedensel: '♿', dehb: '⚡',
};
const SUGGESTIONS = [
  'Okuma güçlüğü çeken öğrencilere hangi stratejiler uygulanmalıdır?',
  'Otizmli öğrencilerde sosyal beceri nasıl geliştirilir?',
  'Sınıf ortamında dikkat eksikliği nasıl yönetilir?',
];

export default function Query() {
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchStudents(); fetchConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/students`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const d = await res.json(); setStudents(d.items || []); }
    } catch {}
  };
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API}/conversations`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const d = await res.json(); setConversations(d.items || []); }
    } catch {}
  };
  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API}/conversations/${convId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setConversationId(convId);
        setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
        if (data.student_id) setSelectedStudentId(data.student_id);
      }
    } catch {}
  };

  // Öğrenci değiştiğinde YENİ konuşma başlat
  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setConversationId(null);
    setMessages([]);
    setError('');
  };

  const startNewConversation = () => {
    setConversationId(null); setMessages([]); setError('');
  };

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`${API}/conversations/${convId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      if (conversationId === convId) startNewConversation();
      fetchConversations();
    } catch {}
  };

  const sendFeedback = async (responseId: string, isHelpful: boolean) => {
    if (feedbackSent[responseId] !== undefined) return;
    try {
      await fetch(`${API}/feedback`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ response_id: responseId, is_helpful: isHelpful }),
      });
      setFeedbackSent(prev => ({ ...prev, [responseId]: isHelpful }));
    } catch {}
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true); setError('');
    const currentQuery = query.trim();
    setQuery('');

    try {
      let activeConvId = conversationId;
      if (!activeConvId) {
        const convRes = await fetch(`${API}/conversations`, { method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ title: currentQuery.slice(0, 100), student_id: selectedStudentId || undefined }),
        });
        if (convRes.ok) { const c = await convRes.json(); activeConvId = c.id; setConversationId(c.id); }
      }

      const student = students.find(s => s.id === selectedStudentId);
      const res = await askQuestion({
        query: currentQuery,
        student_id: selectedStudentId || undefined,
        disability_type: student?.disability_type || undefined,
        grade_level: student?.grade_level || undefined,
        conversation_id: activeConvId || undefined,
      });

      setMessages(prev => [...prev, {
        role: 'assistant', content: res.answer, citations: res.citations,
        is_fallback: res.is_fallback, total_latency_ms: res.total_latency_ms, response_id: res.id,
      }]);
      fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally { setLoading(false); }
  };

  const handleSuggestion = (text: string) => { setQuery(text); };

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  // Seçili öğrenciye göre konuşmaları filtrele
  const filteredConversations = selectedStudentId
    ? conversations.filter(c => c.student_id === selectedStudentId)
    : conversations;

  const getScoreColor = (s: number) => s >= 0.7 ? 'var(--color-accent)' : s >= 0.5 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="chat-page">
      {/* ── Sol Panel ── */}
      <aside className="chat-sidebar">
        <button className="chat-new-btn" onClick={startNewConversation}>
          <Plus size={16} /> Yeni Konuşma
        </button>

        {/* Öğrenci Seçici */}
        <div className="chat-student-picker">
          <label><GraduationCap size={13} /> Öğrenci</label>
          <select className="form-select" value={selectedStudentId} onChange={e => handleStudentChange(e.target.value)}>
            <option value="">🌐 Genel Sorgu</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {DISABILITY_EMOJI[s.disability_type] || '👤'} {s.name} — {s.grade_level}. Sınıf
              </option>
            ))}
          </select>
          {selectedStudent && (
            <div className="chat-student-badge">
              <span className="chat-student-dot" />
              {DISABILITY_LABELS[selectedStudent.disability_type]} · Kişiselleştirilmiş
            </div>
          )}
        </div>

        {/* Konuşma Geçmişi */}
        <div className="chat-history">
          <div className="chat-history-title">
            {selectedStudent ? `${selectedStudent.name} Konuşmaları` : 'Tüm Konuşmalar'}
            <span className="chat-history-count">{filteredConversations.length}</span>
          </div>
          {filteredConversations.length === 0 && (
            <div className="chat-history-empty">Henüz konuşma yok</div>
          )}
          {filteredConversations.map(conv => (
            <div key={conv.id}
              className={`chat-conv-item ${conversationId === conv.id ? 'active' : ''}`}
              onClick={() => loadConversation(conv.id)}>
              <div className="chat-conv-content">
                <MessageSquare size={13} />
                <div className="chat-conv-text">
                  <div className="chat-conv-title">{conv.title}</div>
                  <div className="chat-conv-meta">
                    {conv.student_name && <span>{conv.student_name} · </span>}
                    {conv.message_count} mesaj · {new Date(conv.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
              <button className="chat-conv-delete" onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Sağ Panel: Chat ── */}
      <main className="chat-main">
        {/* Mesajlar */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <Sparkles size={40} />
              </div>
              <h2>Merhaba! 👋</h2>
              <p>
                {selectedStudent
                  ? `${selectedStudent.name} hakkında sormak istediğiniz bir şey var mı?`
                  : 'Özel eğitim alanında size nasıl yardımcı olabilirim?'}
              </p>
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chat-suggestion-chip" onClick={() => handleSuggestion(s)}>
                    💡 {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble-row ${msg.role}`}>
                  <div className={`chat-avatar ${msg.role}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`chat-bubble ${msg.role}`}>
                    {msg.is_fallback && (
                      <div className="chat-fallback-tag">⚠️ Kaynak bulunamadı</div>
                    )}
                    <div className="chat-bubble-text">{msg.content}</div>

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="chat-citations">
                        <BookOpen size={12} /> Kaynaklar
                        <div className="chat-citation-chips">
                          {msg.citations.map((c, ci) => (
                            <span key={ci} className="chat-citation-chip">
                              📄 {c.source_title}
                              <span style={{ color: getScoreColor(c.similarity_score), marginLeft: 4 }}>
                                {(c.similarity_score * 100).toFixed(0)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    {msg.role === 'assistant' && (
                      <div className="chat-bubble-footer">
                        {msg.total_latency_ms && (
                          <span className="chat-latency"><Clock size={10} /> {(msg.total_latency_ms / 1000).toFixed(1)}s</span>
                        )}
                        {msg.response_id && feedbackSent[msg.response_id] === undefined && (
                          <div className="chat-feedback-btns">
                            <button onClick={() => sendFeedback(msg.response_id!, true)}><ThumbsUp size={12} /></button>
                            <button onClick={() => sendFeedback(msg.response_id!, false)}><ThumbsDown size={12} /></button>
                          </div>
                        )}
                        {msg.response_id && feedbackSent[msg.response_id] !== undefined && (
                          <span className="chat-feedback-done">
                            {feedbackSent[msg.response_id] ? '✅ Teşekkürler!' : '📝 Kaydedildi'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-bubble-row assistant">
                  <div className="chat-avatar assistant"><Bot size={16} /></div>
                  <div className="chat-bubble assistant">
                    <div className="chat-typing"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {error && <div className="alert-error" style={{ margin: '0 20px 8px' }}>{error}</div>}

        {/* Input Bar */}
        <form className="chat-input-bar" onSubmit={handleSubmit}>
          {selectedStudent && (
            <div className="chat-input-context">
              {DISABILITY_EMOJI[selectedStudent.disability_type]} {selectedStudent.name} · {selectedStudent.grade_level}. Sınıf
            </div>
          )}
          <div className="chat-input-row">
            <textarea className="chat-input" rows={1} placeholder="Sorunuzu yazın…" value={query}
              onChange={e => { setQuery(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              required minLength={3} />
            <button type="submit" className="chat-send-btn" disabled={loading || !query.trim()}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
