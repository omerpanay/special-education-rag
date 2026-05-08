import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/');
    } catch { /* error handled by context */ }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <GraduationCap size={40} color="var(--color-primary-light)" />
        </div>
        <h2>Sign in to EduRAG</h2>
        <p className="auth-subtitle">Welcome to your special education assistant</p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email"><Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Email</label>
            <input id="email" type="email" className="form-input" placeholder="teacher@school.edu"
              value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required />
          </div>
          <div className="form-group">
            <label htmlFor="password"><Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Password</label>
            <input id="password" type="password" className="form-input" placeholder="••••••••"
              value={password} onChange={e => { setPassword(e.target.value); clearError(); }} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
