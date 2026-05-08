import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main, #0f1117)',
      flexDirection: 'column',
      gap: 24,
      textAlign: 'center',
      padding: 32,
    }}>
      <div style={{
        width: 80, height: 80,
        borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={36} color="#ef4444" />
      </div>

      <div>
        <h1 style={{
          fontSize: '5rem', fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.4rem', marginTop: 12, marginBottom: 8, color: '#e2e8f0' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: 360, margin: '0 auto' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <Link
        to="/"
        className="btn btn-primary"
        style={{ textDecoration: 'none', marginTop: 8 }}
      >
        <Home size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
