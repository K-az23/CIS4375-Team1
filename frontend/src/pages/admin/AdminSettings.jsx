import { useEffect, useState } from 'react';
import { Check, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import { api } from '../../api/client';
import { formatPhone, phoneDigits } from '../../api/format';
import { business } from '../../data/business';

export default function AdminSettings() {
  const [profile, setProfile] = useState({
    email: '',
    phone: '',
  });

  const [original, setOriginal] = useState({
    email: '',
    phone: '',
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/users/me')
      .then(({ user }) => {
        const loaded = {
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

    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  async function saveProfile(e) {
    e.preventDefault();

    setError('');
    setSaved(false);

    const changes = Object.fromEntries(
      Object.entries(profile).filter(
        ([key, value]) => value !== original[key],
      ),
    );

    if (changes.phone !== undefined) {
      changes.phone = phoneDigits(changes.phone);
    }

    if (Object.keys(changes).length === 0) {
      setSaved(true);
      return;
    }

    setSaving(true);

    try {
      const { user } = await api('/api/users/me', {
        method: 'PATCH',
        body: changes,
      });

      const updated = {
        email: user.email ?? '',
        phone: formatPhone(user.phone),
      };

      setProfile(updated);
      setOriginal(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DashboardHeader eyebrow="Account" title="Settings" subtitle="Account information and business details." showIcons />
      <div className="two-col" style={{ alignItems: 'start' }}>
        <Panel title="Account contact information">
          <form className="form" style={{ marginTop: 12 }} onSubmit={saveProfile}>
            {saved && <p className="notice"><Check size={16} /> Changes saved.</p>}
            {error && (<p className="notice notice--warning"><Info size={16}/>{error}</p>)}
            <div className="field">
              <label htmlFor="notify-email">Notification/Admin email address</label>
              <input id="admin-email" name="email" type="email" required value={profile.email} onChange={update}/>
              <span className="field-hint">This is the email used to sign in to the admin account.</span>
            </div>
            <div className="field">
              <label htmlFor="admin-phone">Phone number.</label>
              <input id="admin-phone" type="tel" placeholder="Private – never shown on the site" value={profile.phone} onChange={update} />
              <span className = "field-hint">Stored as contact information for the admin account.</span>
            </div>
            <div><button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
          </form>
        </Panel>

        <Panel title="Business details">
          <SpecList rows={[
            ['Name', business.name],
            ['Address', business.addressLine1],
            ['', business.addressLine2],
            ['Booking', 'Setmore Pro'],
            ['Reviews', 'Sent by Setmore after each visit'],
            ...business.hours.map((h) => [h.days, h.time]),
          ]} />
          <p className="field-hint" style={{ marginTop: 12 }}>Edit these in src/data/business.js.</p>
        </Panel>
      </div>
    </>
  );
}