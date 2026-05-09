import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0F1419',
      flexDirection: 'column',
      gap: 24,
      textAlign: 'center',
      padding: 32,
    }}>
      <div style={{
        width: 80, height: 80,
        borderRadius: '50%',
        background: 'rgba(224,122,95,0.1)',
        border: '1px solid rgba(224,122,95,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={36} color="#E07A5F" />
      </div>

      <div>
        <h1 style={{
          fontSize: '5rem', fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #4F6D7A, #6B9080)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.4rem', marginTop: 12, marginBottom: 8, color: '#E8ECF1' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#8899A6', fontSize: '0.95rem', maxWidth: 360, margin: '0 auto' }}>
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
