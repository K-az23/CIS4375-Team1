import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import { isDemoMode } from '../../context/authUtils.js';
import { useAuth } from '../../context/useAuth.js';
import { getProfile } from '../../services/users';

function toForm(user) {
  return {
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email ?? '',
    phone: (user.phone ?? '').replace(/^\+1(?=[0-9]{10}$)/, ''),
  };
}

export default function CustomerSettings() {
  const { saveProfile } = useAuth();
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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
        if (!controller.signal.aborted) setError(error.message);
      });

    return () => controller.abort();
  }, []);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setSaved(false);
    setError('');

    const changes = Object.fromEntries(
      Object.entries(form).filter(([key, value]) => value !== original[key]),
    );

    if (Object.keys(changes).length === 0) return;

    setSaving(true);
    try {
      const user = await saveProfile(changes);
      const fields = toForm(user);
      setOriginal(fields);
      setForm(fields);
      setSaved(true);
    } catch (error) {
      setError(Object.values(error.details ?? {}).join(' ') || error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DashboardHeader eyebrow="Account" title="Settings" subtitle="Your contact details." />

      {isDemoMode && <p className="notice">Sign in with a real account to manage your contact details.</p>}
      {!isDemoMode && !form && !error && <p role="status">Loading your profile…</p>}
      {error && <p role="alert" className="notice notice--warning">{error}</p>}

      {form && (
        <form className="card form" style={{ maxWidth: 640 }} onSubmit={submit}>
          {saved && <p role="status" className="notice">Changes saved.</p>}

          <div className="form-row">
            <div className="field">
              <label htmlFor="first">First name</label>
              <input id="first" name="first_name" required maxLength={100} value={form.first_name} onChange={change} disabled={saving} />
            </div>
            <div className="field">
              <label htmlFor="last">Last name</label>
              <input id="last" name="last_name" required maxLength={100} value={form.last_name} onChange={change} disabled={saving} />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" required maxLength={150} value={form.email} onChange={change} disabled={saving} />
              <span className="field-hint">Use the same email you book with in Setmore.</span>
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={change} disabled={saving} />
              <span className="field-hint">Enter 10 digits, without the country code.</span>
            </div>
          </div>

          <div className="row">
            <button type="submit" className="btn btn-dark" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}