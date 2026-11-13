import { useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Info } from 'lucide-react';

import { api, ENDPOINTS } from '../../api/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setSuccess('');

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
      const data = await api(
        ENDPOINTS.resetPassword,
        {
          method: 'POST',
          body: {
            token,
            password,
          },
        }
      );

      setSuccess(data.message);

      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <section className="auth">
        <div className="auth__card">
          <div className="auth__head">
            <span className="eyebrow">
              Password reset
            </span>

            <h1>Invalid reset link</h1>

            <p className="muted">
              This password reset link is missing or invalid.
              Request a new reset link and try again.
            </p>
          </div>

          <p
            className="notice notice--warning"
            style={{ marginBottom: 16 }}
          >
            <Info size={16} />
            This reset link cannot be used.
          </p>

          <Link
            to="/login"
            className="btn btn-dark btn-block"
          >
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
          <span className="eyebrow">
            Account security
          </span>

          <h1>Reset your password</h1>

          <p className="muted">
            Enter a new password for your account.
          </p>
        </div>

        {error && (
          <p
            className="notice notice--warning"
            style={{ marginBottom: 16 }}
          >
            <Info size={16} />
            {error}
          </p>
        )}

        {success && (
          <p
            className="notice"
            style={{ marginBottom: 16 }}
          >
            {success}
          </p>
        )}

        <form
          className="form"
          onSubmit={handleSubmit}
        >
          <div className="field">
            <label htmlFor="password">
              New password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
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
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />
          </div>

          <button
            type="submit"
            className="btn btn-dark btn-block"
            disabled={submitting}
          >
            {submitting
              ? 'Resetting password…'
              : 'Reset password'}
          </button>
        </form>

        <p className="auth__switch">
          Remember your password?{' '}
          <Link to="/login">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}