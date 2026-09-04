import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function isValidFullName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.hasCompletedOnboarding ? '/dashboard' : '/onboarding'} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrorCode('');
    try {
      if (!fullName || !email || !password) {
        throw Object.assign(new Error('Please fill in full name, email, and password.'), {
          code: 'MISSING_FIELDS',
        });
      }
      if (!isValidFullName(fullName)) {
        throw Object.assign(new Error('Please enter your full name (first and last name).'), {
          code: 'INVALID_FULL_NAME',
        });
      }
      if (!isValidEmail(email)) {
        throw Object.assign(new Error('Please enter a valid email address.'), {
          code: 'INVALID_EMAIL',
        });
      }

      const nextUser = await login(email, fullName.trim(), password);
      navigate(nextUser.hasCompletedOnboarding ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message);
      setErrorCode(err.code || '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <p className="brand">SignalDesk</p>
        <h1>Welcome back</h1>
        <p className="lede">Log in to your personalized crypto dashboard.</p>
        <form onSubmit={onSubmit} className="stack-form" noValidate>
          <label>
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First and last name"
              autoComplete="name"
              required
            />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error ? (
            <div className="form-alert" role="alert">
              <p className="error-text">{error}</p>
              {errorCode === 'INVALID_CREDENTIALS' ? (
                <p className="muted">
                  New here? <Link to="/signup">Create an account</Link>
                </p>
              ) : null}
            </div>
          ) : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
