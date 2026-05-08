import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Mail, Lock, User } from 'lucide-react';

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
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
          <h2>Registration Successful!</h2>
          <p className="auth-subtitle">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <GraduationCap size={40} color="var(--color-primary-light)" />
        </div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Register to access EduRAG platform</p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName"><User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Full Name</label>
            <input id="fullName" type="text" className="form-input" placeholder="Jane Smith"
              value={fullName} onChange={e => { setFullName(e.target.value); clearError(); }} required />
          </div>
          <div className="form-group">
            <label htmlFor="regEmail"><Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Email</label>
            <input id="regEmail" type="email" className="form-input" placeholder="teacher@school.edu"
              value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required />
          </div>
          <div className="form-group">
            <label htmlFor="regPassword"><Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Password</label>
            <input id="regPassword" type="password" className="form-input" placeholder="At least 6 characters"
              value={password} onChange={e => { setPassword(e.target.value); clearError(); }} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
