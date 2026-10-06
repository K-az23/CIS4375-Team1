import { useState } from 'react';
import { CreditCard, Lock, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { currentCustomer } from '../../data/sampleData';

export default function PaymentMethod() {
  const card = currentCustomer.cardOnFile;
  const [editing, setEditing] = useState(!card);
  const [agreed, setAgreed] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setEditing(false);
  }

  return (
    <>
      <DashboardHeader eyebrow="Payments" title="Card on file" subtitle="Required to book. You're only charged after your appointment or for no-shows." />

      <div className="two-col" style={{ maxWidth: 900, alignItems: 'start' }}>
        <div className="card stack">
          {saved && <p className="notice"><Check size={16} /> Card saved.</p>}
          {card && !editing ? (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="row">
                  <span className="icon-circle"><CreditCard size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{card.brand} •••• {card.last4}</div>
                    <div className="field-hint">Expires {card.exp}</div>
                  </div>
                </div>
              </div>
              <div><button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Replace card</button></div>
            </>
          ) : (
            <form className="form" onSubmit={handleSave}>
              <div className="field">
                <label>Card details</label>
                {/* Stripe's card field mounts here */}
                <div id="card-element" className="embed-placeholder" style={{ padding: 16 }}>
                  <span className="row" style={{ justifyContent: 'center' }}><Lock size={15} /> Secure Stripe card field</span>
                </div>
              </div>
              <label className="checkbox">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                I agree to be charged a $50 no-show fee for missed hair replacement appointments.
              </label>
              <div className="row">
                <button type="submit" className="btn btn-dark" disabled={!agreed}>Save card</button>
                {card && <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>}
              </div>
            </form>
          )}
        </div>

        <div className="card stack">
          <h4>How your card is used</h4>
          <ul className="small muted stack" style={{ gap: 8 }}>
            <li>Services are charged after your appointment, or you can pay cash.</li>
            <li>No deposit is taken when you book.</li>
            <li>Card details are stored by Stripe, never on our servers.</li>
          </ul>
        </div>
      </div>
    </>
  );
}