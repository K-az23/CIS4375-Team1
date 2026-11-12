import { useState } from 'react';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { business } from '../../data/business';

export default function BookAppointment() {
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <DashboardHeader eyebrow="Appointments" title="Book an appointment" subtitle="Pick a service and time. Booking is handled by Setmore." />

      {/* Card on file is turned off (no-show fees aren't charged), so booking no
          longer asks for a saved card first. */}
      {(
        <div className="page-stack">
          <div className="card stack" style={{ maxWidth: 720 }}>
            <h3>Booking policy</h3>
            <p className="muted small">
              Please cancel at least 12 hours ahead. Arriving more than 15 minutes late counts as a no-show.
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