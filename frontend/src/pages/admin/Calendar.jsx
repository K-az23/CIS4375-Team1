import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Info, RefreshCw } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SpecList from '../../components/SpecList';
import { api } from '../../api/client';
import { appointmentStatusLabel, customerName, formatAppointment, isoDaysFromToday } from '../../api/format';
import { business } from '../../data/business';

const DAYS_SHOWN = 7;
const SYNC_DAYS = 14;

const columns = [
  { key: 'date', label: 'Day', nowrap: true, render: (r) => formatAppointment(r.appointment_time, 'date') },
  { key: 'time', label: 'Time', nowrap: true, render: (r) => formatAppointment(r.appointment_time, 'time') },
  { key: 'customer', label: 'Client', render: (r) => customerName(r.customer) },
  { key: 'service', label: 'Service', render: (r) => r.service?.service_name ?? '—' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={appointmentStatusLabel(r.status)} /> },
];

export default function Calendar() {
  const [appointments, setAppointments] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    return api(`/api/admin/appointments?start=${isoDaysFromToday(0)}&end=${isoDaysFromToday(DAYS_SHOWN - 1)}`)
      .then((data) => setAppointments(data.appointments ?? []))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  // Pulls the next two weeks of bookings (and services) from Setmore into our database.
  async function sync() {
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const data = await api(`/api/admin/appointments/sync?days=${SYNC_DAYS}`, { method: 'POST' });
      const s = data.appointments ?? {};
      setMessage(`Synced from Setmore: ${s.created?.length ?? 0} new, ${s.updated?.length ?? 0} updated, ${s.skipped?.length ?? 0} skipped.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <DashboardHeader eyebrow="Schedule" title="Calendar" subtitle="Bookings are managed in Setmore and synced here." showIcons>
        <button className="btn btn-outline btn-sm" onClick={sync} disabled={syncing}>
          <RefreshCw size={16} /> {syncing ? 'Syncing…' : 'Sync from Setmore'}
        </button>
        <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open Setmore</a>
        <Link to="/admin/checkout" className="btn btn-dark btn-sm">Check out clients <ArrowRight size={16} /></Link>
      </DashboardHeader>

      <div className="page-stack">
      {message && <p className="notice"><Check size={16} /> {message}</p>}
      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

      <div className="cust-grid">
        <Panel title={`Next ${DAYS_SHOWN} days`}>
          <DataTable
            columns={columns}
            rows={(appointments ?? []).map((a) => ({ ...a, id: a.setmore_booking_id }))}
            emptyMessage={appointments === null && !error ? 'Loading…' : 'No bookings in the next 7 days. Try Sync from Setmore.'}
          />
        </Panel>
        <Panel title="Business hours">
          <SpecList rows={business.hours.map((h) => [h.days, h.time])} />
          <p className="field-hint" style={{ marginTop: 12 }}>Closed major holidays. Hair system services 75 min, haircuts 45 min.</p>
        </Panel>
      </div>
      </div>
    </>
  );
}
