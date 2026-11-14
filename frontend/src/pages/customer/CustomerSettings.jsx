import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import { isDemoMode } from '../../context/authUtils.js';
import { useAuth } from '../../context/useAuth.js';
import { getProfile } from '../../services/users';
import { api, ENDPOINTS } from '../../api/client';
import { formatPhone, phoneDigits } from '../../api/format';

// Put the saved profile into the fields used by this form.
function toForm(user) {
  return {
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email ?? '',
    phone: formatPhone(user.phone),
  };
}

export default function CustomerSettings() {
  const { saveProfile } = useAuth();

  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load the actual account details when the page opens.
  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    getProfile({ signal: controller.signal })
      .then((user) => {
        if (controller.signal.aborted) return;

        const fields = toForm(user);
        setOriginal(fields);
        setForm(fields);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      });

    return () => controller.abort();
  }, []);

  function change(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSaved(false);
    setError('');
  }

  // Send only the profile fields that changed.
  // AuthContext also updates the user's displayed name after saving.
  async function submit(event) {
    event.preventDefault();
    setSaved(false);
    setError('');

    const changes = Object.fromEntries(
      Object.entries(form).filter(
        ([key, value]) => value !== original[key]
      )
    );

    if (changes.phone !== undefined) {
      changes.phone = phoneDigits(changes.phone);
    }

    if (Object.keys(changes).length === 0) return;

    setSaving(true);

    try {
      const user = await saveProfile(changes);
      const fields = toForm(user);

      setOriginal(fields);
      setForm(fields);
      setSaved(true);
    } catch (error) {
      setError(
        Object.values(error.details ?? {}).join(' ') ||
        error.message
      );
    } finally {
      setSaving(false);
    }
  }

  // Keep password changes separate from contact-detail saves.
  async function changePassword(event) {
    event.preventDefault();

    if (passwordSaving) return;

    setPasswordError('');
    setPasswordMessage('');

    if (passwords.next !== passwords.confirm) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordSaving(true);

    try {
      await api(ENDPOINTS.changePassword, {
        method: 'POST',
        body: {
          current_password: passwords.current,
          new_password: passwords.next,
        },
      });

      setPasswords({
        current: '',
        next: '',
        confirm: '',
      });

      setPasswordMessage('Password changed.');
    } catch (error) {
      setPasswordError(
        Object.values(error.details ?? {}).join(' ') ||
        error.message
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Your contact details and password."
      />

      {isDemoMode && (
        <p className="notice">
          Sign in with a real account to manage your contact details.
        </p>
      )}

      {!isDemoMode && !form && !error && (
        <p role="status">Loading your profile…</p>
      )}

      {error && (
        <p role="alert" className="notice notice--warning">
          {error}
        </p>
      )}

      {form && (
        <form
          className="card form"
          style={{ maxWidth: 640 }}
          onSubmit={submit}
        >
          {saved && (
            <p role="status" className="notice">
              Changes saved.
            </p>
          )}

          <div className="form-row">
            <div className="field">
              <label htmlFor="first">First name</label>
              <input
                id="first"
                name="first_name"
                required
                maxLength={100}
                value={form.first_name}
                onChange={change}
                disabled={saving}
              />
            </div>

            <div className="field">
              <label htmlFor="last">Last name</label>
              <input
                id="last"
                name="last_name"
                required
                maxLength={100}
                value={form.last_name}
                onChange={change}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={150}
                value={form.email}
                onChange={change}
                disabled={saving}
              />
              <span className="field-hint">
                Use the same email you book with in Setmore.
              </span>
            </div>

            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={change}
                disabled={saving}
              />
              <span className="field-hint">
                Enter your 10-digit phone number.
                Spaces and parentheses are okay.
              </span>
            </div>
          </div>

          <div className="row">
            <button
              type="submit"
              className="btn btn-dark"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword
                ? 'Close password form'
                : 'Change password'}
            </button>
          </div>
        </form>
      )}

      {showPassword && (
        <form
          className="card form"
          style={{ maxWidth: 640, marginTop: 24 }}
          onSubmit={changePassword}
        >
          <h3>Change password</h3>

          {passwordMessage && (
            <p role="status" className="notice">
              {passwordMessage}
            </p>
          )}

          {passwordError && (
            <p role="alert" className="notice notice--warning">
              {passwordError}
            </p>
          )}

          <div className="field">
            <label htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={passwords.current}
              disabled={passwordSaving}
              onChange={(event) =>
                setPasswords({
                  ...passwords,
                  current: event.target.value,
                })
              }
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwords.next}
                disabled={passwordSaving}
                onChange={(event) =>
                  setPasswords({
                    ...passwords,
                    next: event.target.value,
                  })
                }
              />
              <span className="field-hint">
                At least 8 characters.
              </span>
            </div>

            <div className="field">
              <label htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={passwords.confirm}
                disabled={passwordSaving}
                onChange={(event) =>
                  setPasswords({
                    ...passwords,
                    confirm: event.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="row">
            <button
              type="submit"
              className="btn btn-dark"
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}