import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { askQuestion } from '../services/api';
import { Send, Sparkles, Plus, MessageSquare, Trash2, ThumbsUp, ThumbsDown, Bot, Copy, AlertCircle, RefreshCw, User, BookOpen, Zap } from 'lucide-react';
import ChatMessageContent from '../components/Chat/ChatMessageContent';

const API = 'http://localhost:8000/api/v1';
const getToken = () => localStorage.getItem('access_token');

interface StudentOption { id: string; name: string; disability_type: string; grade_level: number; }
interface Citation { source_id: string; source_title: string; source_type: string; page_numbers: number[]; similarity_score: number; }
interface ChatMessage {
  role: 'user' | 'assistant'; content: string;
  citations?: Citation[]; is_fallback?: boolean;
  total_latency_ms?: number; response_id?: string;
  route_decision?: string;  // 'local' | 'web' | 'hybrid'
}
interface ConversationSummary { id: string; title: string; student_id?: string; student_name?: string; message_count: number; created_at: string; }

const SUGGESTIONS = [
  { icon: BookOpen, text: 'What strategies work best for students with dyslexia?' },
  { icon: Zap, text: 'How to develop social skills in autistic students?' },
  { icon: Sparkles, text: 'Classroom management techniques for ADHD students?' },
];

const DISABILITY_LABELS: Record<string, string> = {
  disleksi: 'Dyslexia', otizm: 'Autism', zihin_yetersizligi: 'Intellectual Disability',
  isitme: 'Hearing Impairment', bedensel: 'Physical Disability', dehb: 'ADHD',
};

export default function Query() {
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    fetchStudents();
    fetchConversations();
  }, []);

  // Pre-select student when navigated from StudentDashboard
  useEffect(() => {
    const stateStudentId = (location.state as any)?.studentId;
    if (stateStudentId) setSelectedStudentId(stateStudentId);
  }, [location.state]);
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
      if (res.ok) {
        const d = await res.json();
        console.log('[SENSEI] Conversations fetched:', d);
        setConversations(d.items || []);
      } else {
        console.warn('[SENSEI] Conversations fetch failed:', res.status, await res.text());
      }
    } catch (e) {
      console.error('[SENSEI] Conversations fetch error:', e);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API}/conversations/${convId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setConversationId(convId);
        setMessages((data.messages || []).map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })));
        if (data.student_id) setSelectedStudentId(data.student_id);
      }
    } catch {}
  };

  const startNewConversation = () => { setConversationId(null); setMessages([]); setError(''); setQuery(''); inputRef.current?.focus(); };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e?: FormEvent, suggestion?: string) => {
    if (e) e.preventDefault();
    const currentQuery = suggestion || query;
    if (!currentQuery.trim() || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: currentQuery }];
    setMessages(newMessages);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const res = await askQuestion({
        query: currentQuery,
        student_id: selectedStudentId || undefined,
        conversation_id: conversationId || undefined,
      });
      if (!conversationId && res.conversation_id) {
        setConversationId(res.conversation_id);
        fetchConversations();
      }
      const answerText = typeof res.answer === 'string' ? res.answer : JSON.stringify(res.answer);
      setMessages([...newMessages, {
        role: 'assistant',
        content: answerText,
        citations: res.citations,
        is_fallback: res.is_fallback,
        total_latency_ms: res.total_latency_ms,
        response_id: String(res.id),
        route_decision: res.route_decision,
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden', minHeight: 0, height: '100%' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{ background: '#FAFAFA', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* New Chat Button */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={startNewConversation}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '12px', border: '2px dashed var(--color-primary-dim)',
              background: 'transparent', color: 'var(--color-primary)', fontFamily: 'Outfit', fontWeight: 700,
              fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent-peach)'; e.currentTarget.style.borderStyle = 'solid'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderStyle = 'dashed'; }}
          >
            <Plus size={18} /> New Conversation
          </button>
        </div>

        {/* Student Filter */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
            Context Mode
          </label>
          <select
            className="form-select"
            value={selectedStudentId}
            onChange={e => { setSelectedStudentId(e.target.value); setConversationId(null); setMessages([]); }}
            style={{ width: '100%', fontSize: '13px' }}
          >
            <option value="">🌐 General Knowledge Base</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>👤 {s.name} ({DISABILITY_LABELS[s.disability_type] || s.disability_type})</option>
            ))}
          </select>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '10px', padding: '0 4px' }}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            />
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          </div>
          {conversations.filter(c => !convSearch || (c.title || '').toLowerCase().includes(convSearch.toLowerCase()) || (c.student_name || '').toLowerCase().includes(convSearch.toLowerCase())).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <MessageSquare size={28} style={{ color: 'var(--border-strong)', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No conversations yet</p>
            </div>
          ) : (
            conversations
              .filter(c => !convSearch || (c.title || '').toLowerCase().includes(convSearch.toLowerCase()) || (c.student_name || '').toLowerCase().includes(convSearch.toLowerCase()))
              .map(c => (
              <div
                key={c.id}
                onClick={() => loadConversation(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '2px',
                  background: c.id === conversationId ? 'var(--color-accent-peach)' : 'transparent',
                  border: `1px solid ${c.id === conversationId ? 'var(--color-primary-dim)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (c.id !== conversationId) e.currentTarget.style.background = '#F0F0F0'; }}
                onMouseLeave={e => { if (c.id !== conversationId) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                  <MessageSquare size={15} style={{ color: c.id === conversationId ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: '13px', fontWeight: c.id === conversationId ? 600 : 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {c.title || 'New Conversation'}
                    </p>
                    {c.student_name && <p style={{ fontSize: '11px', color: 'var(--color-primary)', margin: 0, fontWeight: 600 }}>{c.student_name}</p>}
                  </div>
                </div>
                <button
                  onClick={ev => deleteConversation(c.id, ev)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', flexShrink: 0, opacity: 0.5 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{
          padding: '14px 28px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--color-accent-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>SENSEI Assistant</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {selectedStudent ? `Context: ${selectedStudent.name} · ${DISABILITY_LABELS[selectedStudent.disability_type]}` : 'General Knowledge Base · RAG Powered'}
              </p>
            </div>
          </div>
          {selectedStudent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: 'var(--color-accent-peach)', border: '1px solid var(--color-primary-dim)' }}>
              <User size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>{selectedStudent.name}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {messages.length === 0 ? (
            /* Welcome State */
            <div style={{ margin: 'auto', maxWidth: '620px', textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '24px', margin: '0 auto 24px',
                background: 'linear-gradient(135deg, var(--color-primary), #FF9F6B)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(255,107,53,0.25)',
              }}>
                <Bot size={40} color="#fff" />
              </div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                How can I help you today?
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '36px', lineHeight: 1.6 }}>
                I'm trained on special education research and can answer questions about teaching strategies, IEP development, and student support.
              </p>
              {/* Left: Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(undefined, s.text)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
                      background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '14px',
                      textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-primary)', fontSize: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-accent-peach)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-accent-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <s.icon size={18} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                {/* Avatar */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-accent-peach)',
                }}>
                  {msg.role === 'user' ? <User size={18} color="#fff" /> : <Bot size={18} style={{ color: 'var(--color-primary)' }} />}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: '72%', minWidth: '60px' }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, var(--color-primary), #FF8C5A)' : 'var(--bg-surface-alt)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(255,107,53,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
                    border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <ChatMessageContent content={msg.content} role={msg.role} />
                  </div>

                  {/* Assistant Footer — inline citations in text, meta actions here */}
                  {msg.role === 'assistant' && (
                    <div style={{ marginTop: '8px', padding: '0 4px' }}>
                      {/* Web search indicator */}
                      {(msg.route_decision === 'web' || msg.route_decision === 'hybrid') && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          color: '#1D4ED8', fontSize: '12px', fontWeight: 600,
                          marginBottom: '8px', padding: '5px 10px',
                          background: 'rgba(59,130,246,0.08)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '8px',
                        }}>
                          🌐 {msg.route_decision === 'hybrid' ? 'Academic sources + web search used' : 'Web search used'}
                        </div>
                      )}
                      {/* Fallback */}
                      {msg.is_fallback && !msg.route_decision && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontSize: '12px', fontWeight: 600, marginBottom: '8px', padding: '6px 10px', background: '#FEF3C7', borderRadius: '8px', width: 'fit-content' }}>
                          <AlertCircle size={13} /> Not found in knowledge base
                        </div>
                      )}
                      {/* Action bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {msg.total_latency_ms && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>{(msg.total_latency_ms / 1000).toFixed(2)}s</span>}
                        <button onClick={() => handleCopy(msg.content, idx)} style={{ background: 'none', border: 'none', color: copied === idx ? '#2D936C' : 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', transition: 'all 0.15s' }} title="Copy response">
                          <Copy size={14} />
                        </button>
                        {msg.response_id && <>
                          <button onClick={() => sendFeedback(msg.response_id!, true)} style={{ background: 'none', border: 'none', color: feedbackSent[msg.response_id!] === true ? '#2D936C' : 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }} title="Helpful">
                            <ThumbsUp size={14} />
                          </button>
                          <button onClick={() => sendFeedback(msg.response_id!, false)} style={{ background: 'none', border: 'none', color: feedbackSent[msg.response_id!] === false ? 'var(--color-danger)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }} title="Not helpful">
                            <ThumbsDown size={14} />
                          </button>
                        </>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: 'var(--color-accent-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ padding: '14px 20px', background: 'var(--bg-surface-alt)', borderRadius: '4px 18px 18px 18px', border: '1px solid var(--border-subtle)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '14px 18px', background: '#FDE8E8', border: '1px solid #FECACA', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '14px', color: 'var(--color-danger)' }}>{error}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '20px 28px', background: 'var(--bg-main)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <form onSubmit={handleSubmit} style={{ position: 'relative', maxWidth: '860px', margin: '0 auto' }}>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              style={{ height: '58px', paddingLeft: '24px', paddingRight: '70px', borderRadius: '18px', fontSize: '15px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)', border: '1.5px solid var(--border-subtle)' }}
              placeholder={selectedStudent ? `Ask about ${selectedStudent.name}...` : 'Ask SENSEI anything about special education...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,107,53,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'; }}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '40px', height: '40px', borderRadius: '12px',
                background: query.trim() && !loading ? 'linear-gradient(135deg, var(--color-primary), #FF8C5A)' : 'var(--bg-surface-alt)',
                color: query.trim() && !loading ? '#fff' : 'var(--text-muted)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: query.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s', boxShadow: query.trim() ? '0 4px 12px rgba(255,107,53,0.3)' : 'none',
              }}
            >
              {loading ? <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={17} />}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            SENSEI AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
