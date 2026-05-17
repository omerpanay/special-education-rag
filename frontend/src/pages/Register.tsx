import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await register({ email, password, full_name: fullName });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch { /* error handled by context */ }
  };

  if (success) {
    return (
      <div className="auth-layout">
        <main className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
          <h2 className="font-headline-md">Registration Successful!</h2>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)' }}>Redirecting to login page...</p>
        </main>
      </div>
    );
  }

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
          <h1 className="font-headline-lg">Create Account</h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)' }}>
            Register to access SENSEI platform
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
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <User size={18} />
              </span>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '44px' }} 
                placeholder="Jane Smith" 
                required 
                value={fullName}
                onChange={e => { setFullName(e.target.value); clearError(); }}
              />
            </div>
          </div>

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
                minLength={6}
                value={password}
                onChange={e => { setPassword(e.target.value); clearError(); }}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Register'} <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer */}
        <p className="font-body-md" style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-label-md" style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
