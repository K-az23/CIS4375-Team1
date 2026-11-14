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

// Keep the optional demo preview consistent with the team's booking policy.
function DemoBookAppointment() {
  return (
    <>
      <DashboardHeader
        eyebrow="Appointments"
        title="Book an appointment"
        subtitle="Pick a service and time. Booking is handled by Setmore."
      />

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

        <a
          href={business.bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-dark"
        >
          Open booking page <ArrowRight size={16} />
        </a>
      </div>
    </>
  );
}

function LiveBookAppointment() {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  // Read the booking address from Flask rather than hardcoding it here.
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

        {booking && (
          <div>
            <a
              href={booking.booking_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-dark"
            >
              Open booking page <ArrowRight size={16} />
            </a>
          </div>
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
    </>
  );
}

export default function BookAppointment() {
  return isDemoMode
    ? <DemoBookAppointment />
    : <LiveBookAppointment />;
}