import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { business } from '../../data/business';
import { isDemoMode } from '../../context/authUtils.js';
import { useAuth } from '../../context/useAuth.js';
import {
  getBookingInfo,
  appointmentError,
} from '../../services/appointments';

// Keep main's policy checkbox before showing the Setmore link.
function BookingPolicy({ bookingUrl }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="card stack" style={{ maxWidth: 720 }}>
      <h3>Booking policy</h3>

      <p>
        No card or deposit is needed to book.
        Services are paid at the salon.
      </p>

      <p className="muted small">
        Please cancel at least 12 hours ahead.
        Arriving more than 15 minutes late counts as a no-show.
      </p>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        I agree to the cancellation and no-show policy.
      </label>

      {agreed && (
        <div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-dark"
          >
            Open booking page <ArrowRight size={16} />
          </a>
        </div>
      )}
    </div>
  );
}

// Keep the existing optional demo preview.
function DemoBookAppointment() {
  return (
    <>
      <DashboardHeader
        eyebrow="Appointments"
        title="Book an appointment"
        subtitle="Pick a service and time. Booking is handled by Setmore."
      />

      <BookingPolicy bookingUrl={business.bookingUrl} />
    </>
  );
}

function LiveBookAppointment() {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  // Ask Flask for the booking address.
  // Cancel this request if the visitor leaves the page.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await getBookingInfo({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setBooking(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(appointmentError(error));
        }
      }
    }

    load();
    return () => controller.abort();
  }, []);

  return (
    <>
      <DashboardHeader
        eyebrow="Appointments"
        title="Book an appointment"
        subtitle="Choose your service and time in Setmore."
      />

      <div className="page-stack">
        <div className="card stack" style={{ maxWidth: 720 }}>
          <h3>Book with the salon</h3>

          <p>
            Use the same email as your salon account:{' '}
            <strong>{user?.email}</strong>.
          </p>

          <p className="muted">
            Your appointment will appear here after the salon updates
            its calendar. Rescheduling and cancellation are handled
            in Setmore.
          </p>

          {error && (
            <p role="alert" className="notice notice--warning">
              {error}
            </p>
          )}

          {!booking && !error && (
            <p role="status">Loading booking page…</p>
          )}

          <div>
            <Link
              to="/account/appointments"
              className="btn btn-outline"
            >
              My appointments
            </Link>
          </div>
        </div>

        {booking && (
          <BookingPolicy bookingUrl={booking.booking_url} />
        )}
      </div>
    </>
  );
}

export default function BookAppointment() {
  return isDemoMode
    ? <DemoBookAppointment />
    : <LiveBookAppointment />;
}