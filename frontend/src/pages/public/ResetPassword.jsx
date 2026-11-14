import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  resetPassword,
  passwordResetError,
} from '../../services/passwordReset';
import { useAuth } from '../../context/useAuth.js';

export default function ResetPassword() {
  const [query] = useSearchParams();
  const token = query.get('token') || '';

  const { logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Send the token from the email link with the new password.
  async function submit(event) {
    event.preventDefault();

    if (saving) return;

    setError('');

    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      await resetPassword(token, password);

      // Return to a signed-out state so the new password can be used.
      await logout();

      setPassword('');
      setConfirmation('');
      setSaved(true);
    } catch (error) {
      setError(passwordResetError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth__card">
        <h1>Choose a new password</h1>

        {saved ? (
          <p role="status">
            Your password was changed.{' '}
            <Link to="/login">Log in</Link> with your new password.
          </p>
        ) : !token ? (
          <p role="alert">
            This link is missing its reset token.{' '}
            <Link to="/login">Request a new link</Link>.
          </p>
        ) : (
          <form className="form" onSubmit={submit}>
            <p className="muted">
              Use at least eight characters.
            </p>

            {error && (
              <p
                role="alert"
                className="notice notice--warning"
              >
                {error}
              </p>
            )}

            <div className="field">
              <label htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="field">
              <label htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                disabled={saving}
              />
            </div>

            <button
              className="btn btn-dark"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save password'}
            </button>

            <Link to="/login">Back to log in</Link>
          </form>
        )}
      </div>
    </section>
  );
}