import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, CreditCard } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { business } from '../../data/business';
import { currentCustomer } from '../../data/sampleData';

export default function BookAppointment() {
  const card = currentCustomer.cardOnFile;
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <DashboardHeader eyebrow="Appointments" title="Book an appointment" subtitle="Pick a service and time. Booking is handled by Setmore." />

      {!card ? (
        <div className="card stack" style={{ maxWidth: 560 }}>
          <span className="icon-circle"><CreditCard size={18} /></span>
          <h3>Add a card before booking</h3>
          <p className="muted">A card on file is required to book. Nothing is charged until your appointment.</p>
          <div><Link to="/account/payment-method" className="btn btn-dark">Add a card</Link></div>
        </div>
      ) : (
        <div className="page-stack">
          <div className="card stack" style={{ maxWidth: 720 }}>
            <h3>Booking policy</h3>
            <p className="muted small">
              Your {card.brand} ending in {card.last4} stays on file. Cancel at least 12 hours ahead to avoid a fee.
              A $50 fee is charged for no-shows on hair replacement services, and arriving more than 15 minutes
              late counts as a no-show.
            </p>
            <label className="checkbox">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I agree to the cancellation and no-show policy.
            </label>
          </div>

          {agreed && (
            <div className="embed-placeholder" style={{ minHeight: 320, alignContent: 'center' }}>
              <CalendarPlus size={24} />
              <strong>Setmore booking widget</strong>
              <span>The booking calendar is embedded here.</span>
              <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm" style={{ marginTop: 8 }}>
                Open booking page <ArrowRight size={16} />
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}