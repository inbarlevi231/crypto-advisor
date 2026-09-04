import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Tooltip } from '../components/Tooltip';
import { api } from '../services/api';
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

export default function ForgotPassword() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.hasCompletedOnboarding ? '/dashboard' : '/onboarding'} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (!fullName || !email || !newPassword || !confirmPassword) {
        throw Object.assign(new Error('Please fill in all fields.'), { code: 'MISSING_FIELDS' });
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
      if (newPassword.length < 6) {
        throw Object.assign(new Error('Password must be at least 6 characters.'), {
          code: 'WEAK_PASSWORD',
        });
      }
      if (newPassword !== confirmPassword) {
        throw Object.assign(new Error('Passwords do not match.'), { code: 'PASSWORD_MISMATCH' });
      }

      const data = await api.resetPassword({
        email,
        name: fullName.trim(),
        newPassword,
      });
      setSuccess(data.message || 'Password updated successfully. You can sign in now.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <p className="brand">SignalDesk</p>
        <h1>Reset password</h1>
        <p className="lede">Confirm your full name and email, then choose a new password.</p>
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
              New password
              <Tooltip text="Password must be at least 6 characters." />
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error ? (
            <div className="form-alert" role="alert">
              <p className="error-text">{error}</p>
            </div>
          ) : null}
          {success ? (
            <div className="form-alert form-alert--success" role="status">
              <p className="success-text">{success}</p>
            </div>
          ) : null}
          <button className="btn primary" type="submit" disabled={busy || Boolean(success)}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
        <p className="muted">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
