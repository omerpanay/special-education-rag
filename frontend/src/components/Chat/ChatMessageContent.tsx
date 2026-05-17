/**
 * ChatMessageContent
 *
 * Renders an LLM assistant message with:
 *  1. Full Markdown support (bold, italic, headings, bullets, code blocks)
 *  2. Inline [Kaynak: ..., Sayfa: X] citations replaced with styled orange badges
 *  3. User messages: plain text (white on orange bubble)
 *
 * Regex pattern handled:
 *   [Kaynak: Source Title, Sayfa: 12]
 *   [Kaynak: Source Title]
 *   [Source: Source Title, Page: 12]   ← English fallback
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import type { Components } from 'react-markdown';

// ── Regex 1: [Kaynak: ..., Sayfa: X]
const CITATION_REGEX = /\[(?:Kaynak|Source):\s*([^,\]]+?)(?:,\s*(?:Sayfa|Page|p\.|p)\s*:?\s*(\d+))?\]/gi;
// ── Regex 2: [Web: title] or [Kaynak: title, Web: url]
const WEB_CITATION_REGEX = /\[(?:Kaynak|Source):\s*([^,\]]+?),\s*(?:Web|URL):\s*([^\]]+?)\]|\[Web:\s*([^\]]+?)\]/gi;

interface ParsedSegment {
  type: 'text' | 'citation' | 'web';
  value: string;
  // for citation
  source?: string;
  page?: string;
  // for web
  webTitle?: string;
}

/** Split a string into plain text, academic citation, and web citation segments */
function parseInlineCitations(text: string): ParsedSegment[] {
  // Build a combined regex that matches both patterns
  // We manually merge and sort by index
  const segments: ParsedSegment[] = [];
  const matches: Array<{ index: number; end: number; seg: ParsedSegment }> = [];

  // Academic citations
  CITATION_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_REGEX.exec(text)) !== null) {
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      seg: { type: 'citation', value: m[0], source: m[1]?.trim(), page: m[2]?.trim() },
    });
  }

  // Web citations
  WEB_CITATION_REGEX.lastIndex = 0;
  while ((m = WEB_CITATION_REGEX.exec(text)) !== null) {
    const title = m[1] || m[3];
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      seg: { type: 'web', value: m[0], webTitle: title?.trim() },
    });
  }

  // Sort by position in text
  matches.sort((a, b) => a.index - b.index);

  let lastIndex = 0;
  for (const { index, end, seg } of matches) {
    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    segments.push(seg);
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/** Academic citation badge — SENSEI orange */
function CitationBadge({ source, page }: { source: string; page?: string }) {
  return (
    <span
      title={`Academic Source: ${source}${page ? `, Page ${page}` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: '4px',
        maxWidth: '100%',
        background: 'rgba(255, 107, 53, 0.10)',
        color: '#C94C1A',
        fontSize: '11.5px',
        fontWeight: 700,
        padding: '3px 9px 3px 6px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 107, 53, 0.25)',
        cursor: 'default',
        verticalAlign: 'middle',
        lineHeight: 1.4,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        transition: 'background 0.15s, border-color 0.15s',
        userSelect: 'none',
        margin: '2px 2px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLSpanElement).style.background = 'rgba(255, 107, 53, 0.18)';
        (e.currentTarget as HTMLSpanElement).style.borderColor = 'rgba(255, 107, 53, 0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLSpanElement).style.background = 'rgba(255, 107, 53, 0.10)';
        (e.currentTarget as HTMLSpanElement).style.borderColor = 'rgba(255, 107, 53, 0.25)';
      }}
    >
      <BookOpen size={11} strokeWidth={2.5} style={{ marginTop: '2px', flexShrink: 0 }} />
      <span style={{ display: 'inline-block' }}>
        {source}
        {page && (
          <span style={{ opacity: 0.7, fontWeight: 600, marginLeft: '4px', display: 'inline-block' }}>· p.{page}</span>
        )}
      </span>
    </span>
  );
}

/** Web search citation badge — blue/teal to distinguish from academic */
function WebCitationBadge({ title }: { title: string }) {
  return (
    <span
      title={`Web Source: ${title}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: '4px',
        maxWidth: '100%',
        background: 'rgba(59, 130, 246, 0.10)',
        color: '#1D4ED8',
        fontSize: '11.5px',
        fontWeight: 700,
        padding: '3px 9px 3px 6px',
        borderRadius: '6px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        cursor: 'default',
        verticalAlign: 'middle',
        lineHeight: 1.4,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        transition: 'background 0.15s, border-color 0.15s',
        userSelect: 'none',
        margin: '2px 2px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLSpanElement).style.background = 'rgba(59, 130, 246, 0.18)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLSpanElement).style.background = 'rgba(59, 130, 246, 0.10)';
      }}
    >
      <span style={{ fontSize: '11px', marginTop: '1px', flexShrink: 0 }}>🌐</span>
      <span style={{ display: 'inline-block' }}>{title}</span>
    </span>
  );
}

/** Renders a text node — may contain inline citations — as React elements */
function InlineCitationRenderer({ children }: { children: string }) {
  const segments = parseInlineCitations(children);

  if (segments.length === 1 && segments[0].type === 'text') {
    return <>{children}</>;
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'citation' ? (
          <CitationBadge key={i} source={seg.source!} page={seg.page} />
        ) : seg.type === 'web' ? (
          <WebCitationBadge key={i} title={seg.webTitle!} />
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </>
  );
}

// ── Markdown component overrides ──────────────────────────────────────────────
// We inject the citation renderer into every text-bearing element so badges
// appear correctly regardless of where in the markdown the pattern is found.

const mdText = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === 'string') return <InlineCitationRenderer>{children}</InlineCitationRenderer>;
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string'
        ? <InlineCitationRenderer key={i}>{child}</InlineCitationRenderer>
        : child
    );
  }
  return children;
};

const MARKDOWN_COMPONENTS: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p style={{ margin: '0 0 10px 0', lineHeight: 1.75, fontSize: '14px' }}>
      {mdText(children)}
    </p>
  ),
  // Headings
  h1: ({ children }) => (
    <h1 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, margin: '16px 0 8px', color: 'var(--text-primary)' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-primary)' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 700, margin: '12px 0 4px', color: 'var(--text-primary)' }}>
      {children}
    </h3>
  ),
  // Bullet / numbered lists
  ul: ({ children }) => (
    <ul style={{ paddingLeft: '20px', margin: '6px 0 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: '20px', margin: '6px 0 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)' }}>
      {mdText(children)}
    </li>
  ),
  // Inline code
  code: ({ children, className }) => {
    const isBlock = Boolean(className); // fenced code block has language class
    if (isBlock) {
      return (
        <code style={{
          display: 'block', padding: '12px 16px', borderRadius: '10px',
          background: '#1E2330', color: '#E5E7EB', fontSize: '13px',
          fontFamily: 'monospace', overflowX: 'auto', margin: '10px 0',
          lineHeight: 1.6,
        }}>
          {children}
        </code>
      );
    }
    return (
      <code style={{
        padding: '2px 6px', borderRadius: '5px',
        background: 'rgba(255,107,53,0.08)', color: '#C94C1A',
        fontSize: '13px', fontFamily: 'monospace',
      }}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre style={{ margin: '10px 0', borderRadius: '10px', overflow: 'hidden' }}>{children}</pre>
  ),
  // Bold / italic
  strong: ({ children }) => (
    <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{mdText(children)}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{mdText(children)}</em>
  ),
  // Horizontal rule
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '14px 0' }} />
  ),
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '4px solid var(--color-primary)', paddingLeft: '14px',
      margin: '10px 0', color: 'var(--text-secondary)', fontStyle: 'italic',
    }}>
      {children}
    </blockquote>
  ),
  // Links
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
      {children}
    </a>
  ),
  // Tables (remark-gfm)
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ padding: '8px 12px', background: 'var(--color-accent-peach)', color: 'var(--color-primary)', fontWeight: 700, textAlign: 'left', border: '1px solid var(--border-subtle)' }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
      {mdText(children)}
    </td>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

/**
 * Main export — drop-in replacement for the raw <p> inside the chat bubble.
 *
 * Usage:
 *   <ChatMessageContent content={msg.content} role={msg.role} />
 */
export default function ChatMessageContent({ content, role }: ChatMessageContentProps) {
  if (role === 'user') {
    // User bubbles: simple white text, no markdown processing
    return (
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#fff' }}>
        {content}
      </p>
    );
  }

  // Assistant: full Markdown + inline citation badges
  return (
    <div
      style={{
        fontSize: '14px',
        lineHeight: 1.75,
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
      // Remove trailing margin on last child to keep bubble padding tight
      className="chat-md-body"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
