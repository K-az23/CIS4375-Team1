import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { getAppointments, appointmentError } from '../../services/appointments';
import AppointmentDetails from '../../components/AppointmentDetails';
import { business } from '../../data/business';
import { nextAppointment, customerAppointments } from '../../data/sampleData';

const columns = [
  { key: 'date', label: 'Date', nowrap: true },
  { key: 'service', label: 'Service' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

function DemoAppointments() {
  return (
    <>
      <div className="page-stack">
        <div className="card stat-card" style={{ maxWidth: 560 }}>
          <div className="stat-card__top">
            <div>
              <div className="stat-card__label">Upcoming</div>
              <div className="big-line">{nextAppointment.date}</div>
              <div className="stat-card__note">{nextAppointment.time} · {nextAppointment.service}</div>
            </div>
            <span className="icon-circle"><CalendarCheck size={18} /></span>
          </div>
          <div className="stat-card__link">
            <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="link-gold">Reschedule or cancel in Setmore</a>
          </div>
        </div>

        <Panel title="Past appointments">
          <DataTable columns={columns} rows={customerAppointments} />
        </Panel>
      </div>
    </>
  );
}

const statusLabels = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const appointmentDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Chicago',
});

function toRow(appointment, now) {
  const time = appointment.appointment_time;
  // Until the API contract is confirmed, timezone-less timestamps are treated as UTC.
  const timestamp = time
    ? Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(time) ? time : `${time}Z`)
    : NaN;

  return {
    id: appointment.setmore_booking_id,
    timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
    date: Number.isNaN(timestamp) ? 'Time unavailable' : appointmentDate.format(timestamp),
    service: appointment.service_name || (appointment.service_id == null ? 'Service unavailable' : `Service #${appointment.service_id}`),
    status: statusLabels[appointment.status] ?? 'Unknown',
    missing: Boolean(appointment.setmore_missing),
    isUpcoming: !appointment.setmore_missing && appointment.status === 'booked' && timestamp >= now,
  };
}

function LiveAppointments() {
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAppointments() {
      try {
        const appointments = await getAppointments({ signal: controller.signal });
        if (!Array.isArray(appointments)) {
          throw new Error('The server returned an invalid appointment list.');
        }

        if (controller.signal.aborted) return;

        const now = Date.now();
        const rows = appointments.map((appointment) => toRow(appointment, now));
        setSchedule({
          upcoming: rows.filter((row) => row.isUpcoming).sort((a, b) => a.timestamp - b.timestamp),
          verify: rows.filter((row) => row.missing),
          history: rows.filter((row) => !row.isUpcoming && !row.missing).sort((a, b) => b.timestamp - a.timestamp),
        });
      } catch (error) {
        if (!controller.signal.aborted) setError(appointmentError(error));
      }
    }

    loadAppointments();
    return () => controller.abort();
  }, [refresh]);

  const liveColumns = [...columns, {
    key: 'details', label: '', render: (row) => <button className="btn btn-outline btn-sm" onClick={() => setSelectedId(row.id)}>Details</button>,
  }];

  return (
    <div className="page-stack">
      <div><button className="btn btn-outline" onClick={() => {
        setSchedule(null); setError(''); setSelectedId(null); setRefresh((old) => old + 1);
      }}>Refresh appointments</button></div>
      <p className="small muted">Appointment times are shown in Central Time. Use Setmore to reschedule or cancel.</p>
      {error && <p role="alert" className="notice notice--warning">Couldn’t load appointments. {error}</p>}
      {!schedule && !error && <p role="status">Loading appointments…</p>}
      {schedule && <>
        {schedule.verify.length > 0 && <Panel title="Check these bookings in Setmore">
          <p className="field-hint">These bookings were not returned by the latest calendar update. They may have changed dates or been cancelled.</p>
          <DataTable columns={liveColumns} rows={schedule.verify.map((row) => ({ ...row, status: 'Needs verification' }))} />
        </Panel>}
        <Panel title="Upcoming appointments">
          <DataTable columns={liveColumns} rows={schedule.upcoming} emptyMessage="No upcoming appointments." />
        </Panel>
        <Panel title="Appointment history">
          <DataTable columns={liveColumns} rows={schedule.history} emptyMessage="No appointment history yet." />
        </Panel>
      </>}
      {selectedId && <AppointmentDetails key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export default function Appointments() {
  return (
    <>
      <DashboardHeader eyebrow="Appointments" title="My appointments" subtitle="Changes and cancellations are made in Setmore.">
        <Link to="/account/book" className="btn btn-gold btn-sm">Book appointment</Link>
      </DashboardHeader>
      {isDemoMode ? <DemoAppointments /> : <LiveAppointments />}
    </>
  );
}
