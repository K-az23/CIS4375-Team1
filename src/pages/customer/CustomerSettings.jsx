import { useState } from 'react';
import { Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { currentCustomer } from '../../data/sampleData';

export default function CustomerSettings() {
  const [saved, setSaved] = useState(false);

  return (
    <>
      <DashboardHeader eyebrow="Account" title="Settings" subtitle="Your contact details and notifications." />

      <form className="card form" style={{ maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
        {saved && <p className="notice"><Check size={16} /> Changes saved.</p>}
        <div className="form-row">
          <div className="field">
            <label htmlFor="first">First name</label>
            <input id="first" defaultValue={currentCustomer.firstName} />
          </div>
          <div className="field">
            <label htmlFor="last">Last name</label>
            <input id="last" defaultValue={currentCustomer.lastName} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" defaultValue={currentCustomer.email} />
            <span className="field-hint">Use the same email you book with in Setmore.</span>
          </div>
          <div className="field">
            <label htmlFor="phone">Mobile number</label>
            <input id="phone" type="tel" defaultValue={currentCustomer.phone} />
          </div>
        </div>
        <label className="checkbox"><input type="checkbox" defaultChecked /> Email me order and appointment confirmations</label>
        <label className="checkbox"><input type="checkbox" defaultChecked /> Text me when my hair system arrives</label>
        <label className="checkbox"><input type="checkbox" defaultChecked /> Remind me when it's time for my next system</label>
        <div className="row">
          <button type="submit" className="btn btn-dark">Save changes</button>
          <button type="button" className="btn btn-outline">Change password</button>
        </div>
      </form>
    </>
  );
}