import { useEffect, useState } from 'react';
import { Check, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { api, ENDPOINTS } from '../../api/client';
import { formatPhone, phoneDigits } from '../../api/format';

const emptyProfile = { first_name: '', last_name: '', email: '', phone: '' };
const emptyPasswords = { current: '', next: '', confirm: '' };

export default function CustomerSettings() {
  const [profile, setProfile] = useState(emptyProfile);
  const [original, setOriginal] = useState(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    api('/api/users/me')
      .then(({ user }) => {
        const loaded = {
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          email: user.email ?? '',
          phone: formatPhone(user.phone),
        };
        setProfile(loaded);
        setOriginal(loaded);
      })
      .catch((err) => setError(err.message));
  }, []);

  function update(e) {
    setSaved(false);
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    // Only send what changed; the backend rejects an empty update.
    const changes = Object.fromEntries(
      Object.entries(profile).filter(([key, value]) => value !== original[key]),
    );
    if (changes.phone !== undefined) changes.phone = phoneDigits(changes.phone);
    if (Object.keys(changes).length === 0) {
      setSaved(true);
      return;
    }
    setSaving(true);
    try {
      const { user } = await api('/api/users/me', { method: 'PATCH', body: changes });
      const updated = { ...profile, phone: formatPhone(user.phone) };
      setProfile(updated);
      setOriginal(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwords.next !== passwords.confirm) {
      setPasswordError("New passwords don't match.");
      return;
    }
    try {
      await api(ENDPOINTS.changePassword, {
        method: 'POST',
        body: { current_password: passwords.current, new_password: passwords.next },
      });
      setPasswords(emptyPasswords);
      setPasswordMessage('Password changed.');
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  return (
    <>
      <DashboardHeader eyebrow="Account" title="Settings" subtitle="Your contact details and notifications." />

      <form className="card form" style={{ maxWidth: 640 }} onSubmit={saveProfile}>
        {saved && <p className="notice"><Check size={16} /> Changes saved.</p>}
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
        <div className="form-row">
          <div className="field">
            <label htmlFor="first">First name</label>
            <input id="first" name="first_name" required value={profile.first_name} onChange={update} />
          </div>
          <div className="field">
            <label htmlFor="last">Last name</label>
            <input id="last" name="last_name" required value={profile.last_name} onChange={update} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required value={profile.email} onChange={update} />
            <span className="field-hint">Use the same email you book with in Setmore.</span>
          </div>
          <div className="field">
            <label htmlFor="phone">Mobile number</label>
            <input id="phone" name="phone" type="tel" required value={profile.phone} onChange={update} />
          </div>
        </div>
        <label className="checkbox"><input type="checkbox" defaultChecked /> Email me order and appointment confirmations</label>
        <label className="checkbox"><input type="checkbox" defaultChecked /> Text me when my hair system arrives</label>
        <label className="checkbox"><input type="checkbox" defaultChecked /> Remind me when it's time for my next system</label>
        <div className="row">
          <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          <button type="button" className="btn btn-outline" onClick={() => setShowPassword(!showPassword)}>Change password</button>
        </div>
      </form>

      {showPassword && (
        <form className="card form" style={{ maxWidth: 640, marginTop: 24 }} onSubmit={changePassword}>
          <h3>Change password</h3>
          {passwordMessage && <p className="notice"><Check size={16} /> {passwordMessage}</p>}
          {passwordError && <p className="notice notice--warning"><Info size={16} /> {passwordError}</p>}
          <div className="field">
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" required value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
              <span className="field-hint">At least 8 characters.</span>
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            </div>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-dark">Update password</button>
          </div>
        </form>
      )}
    </>
  );
}
