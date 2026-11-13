import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { api, ENDPOINTS } from '../../api/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!token) {
      setError('This password reset link is invalid.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);

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

      setMessage(data.message);

      // Give the customer a moment to see the success message,
      // then return them to the login page.
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <section className="section">
        <div
          className="container stack"
          style={{ maxWidth: 520 }}
        >
          <h1>Reset Password</h1>

          <p className="muted">
            This password reset link is invalid.
          </p>

          <div>
            <Link to="/login" className="btn btn-dark">
              Return to login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div
        className="container stack"
        style={{ maxWidth: 520 }}
      >
        <h1>Reset Password</h1>

        <p className="muted">
          Enter your new password below.
        </p>

        <form
          className="stack"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="password">
              New password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm-password">
              Confirm new password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          {message && (
            <p className="success">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-dark"
            disabled={submitting}
          >
            {submitting
              ? 'Resetting password...'
              : 'Reset password'}
          </button>
        </form>
      </div>
    </section>
  );
}