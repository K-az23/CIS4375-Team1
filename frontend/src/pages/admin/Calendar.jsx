import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SpecList from '../../components/SpecList';
import AppointmentDetails from '../../components/AppointmentDetails';
import { business } from '../../data/business';
import { todaysAppointments } from '../../data/sampleData';
import { isDemoMode } from '../../context/authUtils.js';
import { getAdminAppointments, syncAppointments, appointmentDate, appointmentStatuses, appointmentError, salonDate, getBookingInfo } from '../../services/appointments';

const columns = [
  { key: 'time', label: 'Time', nowrap: true },
  { key: 'customer', label: 'Client' },
  { key: 'services', label: 'Service', render: (row) => row.services.join(', ') },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

function LiveCalendar() {
  const [start, setStart] = useState(salonDate(-7));
  const [end, setEnd] = useState(salonDate(14));
  const [appointments, setAppointments] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [skipped, setSkipped] = useState([]);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await getAdminAppointments({ start, end, signal: controller.signal });
        if (!controller.signal.aborted) setAppointments(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(appointmentError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [start, end, refresh]);

  function reload() {
    setAppointments(null);
    setSelectedId(null);
    setError('');
    setRefresh((old) => old + 1);
  }

  async function sync() {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await syncAppointments();
      const data = result.appointments;
      setMessage(`Setmore updated: ${data.created.length} new, ${data.updated.length} changed, ${data.needs_verification.length} need verification.`);
      setSkipped(data.skipped);
      reload();
    } catch (error) {
      setError(`Couldn’t sync Setmore. ${appointmentError(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function changed(appointment) {
    setAppointments((old) => old.map((item) => item.setmore_booking_id === appointment.setmore_booking_id ? appointment : item));
    setMessage(`Appointment marked ${appointmentStatuses[appointment.status].toLowerCase()}.`);
  }

  const liveColumns = [
    { key: 'appointment_time', label: 'Date · Central Time', nowrap: true, render: (row) => appointmentDate(row.appointment_time) },
    { key: 'customer', label: 'Customer', render: (row) => row.customer?.name || 'Setmore guest' },
    { key: 'service_name', label: 'Service' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.setmore_missing ? 'Needs verification' : appointmentStatuses[row.status] || row.status} /> },
    { key: 'linked_order_ids', label: 'Orders', render: (row) => row.linked_order_ids?.map((id) => `#${id}`).join(', ') || '—' },
    { key: 'details', label: '', render: (row) => <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setSelectedId(row.setmore_booking_id)}>Details</button> },
  ];

  return (
    <div className="page-stack">
      <div className="form-row">
        <div className="field"><label htmlFor="calendar-start">From</label>
          <input id="calendar-start" type="date" value={start} disabled={busy} onChange={(event) => { setStart(event.target.value); reload(); }} /></div>
        <div className="field"><label htmlFor="calendar-end">Through</label>
          <input id="calendar-end" type="date" value={end} disabled={busy} onChange={(event) => { setEnd(event.target.value); reload(); }} /></div>
      </div>
      <div className="row">
        <button className="btn btn-dark" disabled={busy} onClick={sync}>{busy ? 'Working…' : 'Sync from Setmore'}</button>
        <button className="btn btn-outline" disabled={busy} onClick={reload}>Refresh calendar</button>
      </div>
      <p className="field-hint">Sync checks the last 30 days and next 14 days. Booking changes are made in Setmore. Completion and no-show tracking are recorded here; no no-show fee is charged.</p>
      {message && <p role="status" className="notice">{message}</p>}
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      {skipped.length > 0 && <Panel title="Bookings that could not be imported">
        <DataTable columns={[{ key: 'booking_id', label: 'Booking' }, { key: 'reason', label: 'Reason' }]} rows={skipped} />
      </Panel>}
      <Panel title={appointments ? `${appointments.length} appointments` : 'Appointments'}>
        {!appointments && !error && <p role="status">Loading appointments…</p>}
        {appointments && <DataTable columns={liveColumns} rows={appointments.map((row) => ({ ...row, id: row.setmore_booking_id }))} emptyMessage="No appointments in this date range." />}
      </Panel>
      {selectedId && <AppointmentDetails key={selectedId} id={selectedId} admin onSaved={changed} onBusy={setBusy} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export default function Calendar() {
  const [bookingUrl, setBookingUrl] = useState(isDemoMode ? business.bookingUrl : '');
  useEffect(() => {
    if (isDemoMode) return;
    const controller = new AbortController();
    async function loadBookingLink() {
      try {
        const result = await getBookingInfo({ signal: controller.signal });
        if (!controller.signal.aborted) setBookingUrl(result.booking_url);
      } catch {
        // The calendar's own requests show session or connection errors.
      }
    }
    loadBookingLink();
    return () => controller.abort();
  }, []);
  return (
    <>
      <DashboardHeader eyebrow="Schedule" title="Calendar" subtitle="Bookings are managed in Setmore and synced here." showIcons>
        {bookingUrl && <a href={bookingUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open Setmore</a>}
        <Link to="/admin/checkout" className="btn btn-dark btn-sm">Check out clients <ArrowRight size={16} /></Link>
      </DashboardHeader>
      {isDemoMode ? (
        <div className="cust-grid">
          <Panel title="Today"><DataTable columns={columns} rows={todaysAppointments} /></Panel>
          <Panel title="Business hours">
            <SpecList rows={business.hours.map((hour) => [hour.days, hour.time])} />
            <p className="field-hint" style={{ marginTop: 12 }}>Closed major holidays. Hair system services 75 min, haircuts 45 min.</p>
          </Panel>
        </div>
      ) : <LiveCalendar />}
    </>
  );
}
