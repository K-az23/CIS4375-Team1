import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useAuth } from '../../context/useAuth.js';
import {
  resetPassword,
  passwordResetError,
} from '../../services/passwordReset';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Keep main's redirect after a successful reset.
  // Cancel the timer if the visitor leaves this page first.
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [success, navigate]);

  // Send the email link's token and the new password to Flask.
  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || success) return;

    setError('');

    if (!token) {
      setError('This password reset link is invalid.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await resetPassword(token, password);

      // Clear this browser's previous login after the reset.
      // The visitor can then sign in with the new password.
      await logout();

      setPassword('');
      setConfirmPassword('');
      setSuccess(data.message || 'Your password was changed.');
    } catch (error) {
      setError(passwordResetError(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <section className="auth">
        <div className="auth__card">
          <div className="auth__head">
            <span className="eyebrow">Password reset</span>
            <h1>Invalid reset link</h1>
            <p className="muted">
              This password reset link is missing its token.
              Request a new reset link and try again.
            </p>
          </div>

          <p
            role="alert"
            className="notice notice--warning"
            style={{ marginBottom: 16 }}
          >
            <Info size={16} />
            This reset link cannot be used.
          </p>

          <Link to="/login" className="btn btn-dark btn-block">
            Return to login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="auth">
      <div className="auth__card">
        <div className="auth__head">
          <span className="eyebrow">Account security</span>
          <h1>Reset your password</h1>
          <p className="muted">
            Enter a new password for your account.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="notice notice--warning"
            style={{ marginBottom: 16 }}
          >
            <Info size={16} />
            {error}
          </p>
        )}

        {success ? (
          <p role="status" className="notice">
            {success} Returning to login…{' '}
            <Link to="/login">Log in now</Link>
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
              <p className="field-hint">
                Password must be at least 8 characters long.
              </p>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              className="btn btn-dark btn-block"
              disabled={submitting}
            >
              {submitting ? 'Resetting password…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="auth__switch">
          Remember your password? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}