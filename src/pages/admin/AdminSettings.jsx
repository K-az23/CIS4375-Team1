import { useState } from 'react';
import { Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import { business } from '../../data/business';

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);

  return (
    <>
      <DashboardHeader eyebrow="Account" title="Settings" subtitle="Notifications and business details." showIcons />
      <div className="two-col" style={{ alignItems: 'start' }}>
        <Panel title="Notifications">
          <form className="form" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
            {saved && <p className="notice"><Check size={16} /> Settings saved.</p>}
            <label className="checkbox"><input type="checkbox" defaultChecked /> Text me when a client places or pays for a hair order</label>
            <label className="checkbox"><input type="checkbox" defaultChecked /> Text and email me new contact form messages</label>
            <label className="checkbox"><input type="checkbox" defaultChecked /> Email me when an item reaches its reorder level</label>
            <div className="field">
              <label htmlFor="notify-email">Notification email</label>
              <input id="notify-email" type="email" defaultValue={business.email} />
            </div>
            <div className="field">
              <label htmlFor="notify-phone">Mobile number for texts</label>
              <input id="notify-phone" type="tel" placeholder="Private – never shown on the site" />
            </div>
            <div><button type="submit" className="btn btn-dark">Save settings</button></div>
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