import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { appointmentStatusLabel, formatAppointment, parseAppointmentTime } from '../../api/format';
import { business } from '../../data/business';

const columns = [
  { key: 'date', label: 'Date', nowrap: true, render: (r) => formatAppointment(r.appointment_time) },
  { key: 'service', label: 'Service', render: (r) => r.service?.service_name ?? '—' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={appointmentStatusLabel(r.status)} /> },
];

// Booked visits still ahead go in "upcoming"; everything else is history, newest first.
function splitAppointments(list) {
  const now = Date.now();
  const all = list.map((a) => ({ ...a, id: a.setmore_booking_id }));
  const upcoming = all.filter((a) => a.status === 'booked' && parseAppointmentTime(a.appointment_time).getTime() >= now);
  const past = all.filter((a) => !upcoming.includes(a)).reverse();
  return { upcoming, past };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/appointments')
      .then((data) => setAppointments(data.appointments ?? []))
      .catch((err) => setError(err.message));
  }, []);

  const { upcoming, past } = splitAppointments(appointments ?? []);
  const next = upcoming[0];

  return (
    <>
      <DashboardHeader eyebrow="Appointments" title="My appointments" subtitle="Changes and cancellations are made in Setmore.">
        <Link to="/account/book" className="btn btn-gold btn-sm">Book appointment</Link>
      </DashboardHeader>

      <div className="page-stack">
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

        <div className="card stat-card" style={{ maxWidth: 560 }}>
          <div className="stat-card__top">
            <div>
              <div className="stat-card__label">Upcoming</div>
              {next ? (
                <>
                  <div className="big-line">{formatAppointment(next.appointment_time, 'date')}</div>
                  <div className="stat-card__note">{formatAppointment(next.appointment_time, 'time')} · {next.service?.service_name ?? 'Appointment'}</div>
                </>
              ) : (
                <div className="stat-card__note">{appointments === null && !error ? 'Loading…' : 'Nothing booked yet.'}</div>
              )}
            </div>
            <span className="icon-circle"><CalendarCheck size={18} /></span>
          </div>
          <div className="stat-card__link">
            <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="link-gold">
              {next ? 'Reschedule or cancel in Setmore' : 'Book in Setmore'}
            </a>
          </div>
        </div>

        {upcoming.length > 1 && (
          <Panel title="Also coming up">
            <DataTable columns={columns} rows={upcoming.slice(1)} />
          </Panel>
        )}

        <Panel title="Past appointments">
          <DataTable columns={columns} rows={past} emptyMessage="No past appointments yet." />
        </Panel>
      </div>
    </>
  );
}
