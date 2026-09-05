import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Tooltip } from '../components/Tooltip';

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

export default function Signup() {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      if (!fullName || !email || !password || !confirmPassword) {
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
      if (password.length < 6) {
        throw Object.assign(new Error('Password must be at least 6 characters.'), {
          code: 'WEAK_PASSWORD',
        });
      }
      if (password !== confirmPassword) {
        throw Object.assign(new Error('Passwords do not match.'), {
          code: 'PASSWORD_MISMATCH',
        });
      }

      await register({ name: fullName.trim(), email, password });
      navigate('/onboarding');
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
        <h1>Create your account</h1>
        <p className="lede">A short quiz, then a dashboard tuned to how you invest.</p>
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
            <span className="label-row">
              Password
              <Tooltip text="Password must be at least 6 characters." />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          {error ? (
            <div className="form-alert" role="alert">
              <p className="error-text">{error}</p>
              {errorCode === 'EMAIL_EXISTS' ? (
                <p className="muted">
                  Already registered? <Link to="/login">Sign in instead</Link>
                </p>
              ) : null}
            </div>
          ) : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Sign up'}
          </button>
        </form>
        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
