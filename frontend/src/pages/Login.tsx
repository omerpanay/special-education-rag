import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      // error handled by context
    }
  };

  return (
    <div className="auth-layout">
      <main className="auth-card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/sensei-logo.png" 
            alt="SENSEI Logo" 
            style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '16px', borderRadius: '16px' }} 
          />
          <h1 className="font-headline-lg">SENSEI</h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)' }}>
            Welcome back to SENSEI. Please enter your details.
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px', background: '#FDE8E8', color: 'var(--color-danger)', 
            borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px', fontWeight: 500
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Mail size={18} />
              </span>
              <input 
                type="email" 
                className="form-input" 
                style={{ paddingLeft: '44px' }} 
                placeholder="Enter your email" 
                required 
                value={email}
                onChange={e => { setEmail(e.target.value); clearError(); }}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Lock size={18} />
              </span>
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '44px' }} 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={e => { setPassword(e.target.value); clearError(); }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="remember-me" style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
              <label htmlFor="remember-me" className="font-label-md" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Remember me
              </label>
            </div>
            <a href="#" className="font-label-md" style={{ color: 'var(--color-primary)' }}>
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'} <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer */}
        <p className="font-body-md" style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-label-md" style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
