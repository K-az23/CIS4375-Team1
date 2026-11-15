import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Info, RefreshCw } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SpecList from '../../components/SpecList';
import { api } from '../../api/client';
import {
  appointmentStatusLabel,
  customerName,
  formatAppointment,
  isoDaysFromToday,
} from '../../api/format';
import { business } from '../../data/business';

const DAYS_SHOWN = 21;
const SYNC_DAYS = 21;

const columns = [
  {
    key: 'date',
    label: 'Day',
    nowrap: true,
    render: (r) => formatAppointment(r.appointment_time, 'date'),
  },
  {
    key: 'time',
    label: 'Time',
    nowrap: true,
    render: (r) => formatAppointment(r.appointment_time, 'time'),
  },
  {
    key: 'customer',
    label: 'Client',
    render: (r) => customerName(r.customer),
  },
  {
    key: 'service',
    label: 'Service',
    render: (r) => r.service?.service_name ?? '—',
  },
  {
    key: 'status',
    label: 'Status',
    render: (r) => (
      <StatusBadge status={appointmentStatusLabel(r.status)} />
    ),
  },
];

export default function Calendar() {
  const [appointments, setAppointments] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [missing, setMissing] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);

  function load() {
    return api(
      `/api/admin/appointments?start=${isoDaysFromToday(0)}&end=${isoDaysFromToday(DAYS_SHOWN - 1)}`
    )
      .then((data) => setAppointments(data.appointments ?? []))
      .catch((err) => {
        setError(err.message);
        throw err;
      });
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  // Read every page and flag absent bookings for the owner to verify.
  async function sync() {
    if (busy.current) return;

    busy.current = true;
    setSyncing(true);
    setMissing([]);
    setError('');
    setMessage('');

    try {
      const data = await api(
        `/api/admin/appointments/reconcile?days=${SYNC_DAYS}&past_days=30`,
        { method: 'POST' }
      );

      const summary = data.appointments ?? {};

      setMissing(data.missing ?? []);
      setMessage(
        `Synced from Setmore: ${summary.created?.length ?? 0} new, `
        + `${summary.updated?.length ?? 0} updated, `
        + `${summary.skipped?.length ?? 0} skipped. `
        + `${data.missing?.length ?? 0} bookings need verification.`
      );

      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }

  async function confirmCancellation(appointment) {
    if (busy.current) return;

    const confirmed = window.confirm(
      'Have you checked Setmore and confirmed this booking was cancelled, not rescheduled? '
      + 'Continue only after checking the customer’s other booking dates. '
      + 'This records the cancellation in this app.'
    );

    if (!confirmed) return;

    busy.current = true;
    setSyncing(true);
    setError('');
    setMessage('');

    try {
      await api(
        `/api/admin/appointments/${encodeURIComponent(appointment.setmore_booking_id)}/confirm-cancelled`,
        {
          method: 'POST',
          body: {
            confirmed_cancelled: true,
            appointment_time: appointment.appointment_time,
          },
        }
      );

      setMissing((rows) => rows.filter(
        (row) => row.setmore_booking_id !== appointment.setmore_booking_id
      ));

      setMessage('Verified cancellation recorded.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Schedule"
        title="Calendar"
        subtitle="Bookings are managed in Setmore and synced here."
        showIcons
      >
        <button
          className="btn btn-outline btn-sm"
          onClick={sync}
          disabled={syncing}
        >
          <RefreshCw size={16} />
          {syncing ? 'Syncing…' : 'Sync from Setmore'}
        </button>

        <a
          href={business.bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-sm"
        >
          Open Setmore
        </a>

        <Link to="/admin/checkout" className="btn btn-dark btn-sm">
          Check out clients <ArrowRight size={16} />
        </Link>
      </DashboardHeader>

      <div className="page-stack">
        {message && (
          <p className="notice">
            <Check size={16} /> {message}
          </p>
        )}

        {error && (
          <p className="notice notice--warning">
            <Info size={16} /> {error}
          </p>
        )}

        {missing.length > 0 && (
          <Panel title="Bookings to verify">
            <p className="field-hint">
              These bookings were not found during this sync.
              They may have been cancelled or rescheduled.
              Check Setmore, including other dates, before confirming
              a cancellation.
            </p>

            <DataTable
              columns={[
                ...columns,
                {
                  key: 'action',
                  label: '',
                  render: (row) => (
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={syncing}
                      onClick={() => confirmCancellation(row)}
                    >
                      Confirm cancellation
                    </button>
                  ),
                },
              ]}
              rows={missing.map((appointment) => ({
                ...appointment,
                id: appointment.setmore_booking_id,
              }))}
            />
          </Panel>
        )}

        <div className="cust-grid">
          <Panel title={`Next ${DAYS_SHOWN} days`}>
            <DataTable
              columns={columns}
              rows={(appointments ?? []).map((appointment) => ({
                ...appointment,
                id: appointment.setmore_booking_id,
              }))}
              emptyMessage={
                appointments === null && !error
                  ? 'Loading…'
                  : 'No bookings in the next 3 weeks. Try Sync from Setmore.'
              }
            />
          </Panel>

          <Panel title="Business hours">
            <SpecList
              rows={business.hours.map((hours) => [
                hours.days,
                hours.time,
              ])}
            />
            <p className="field-hint" style={{ marginTop: 12 }}>
              Closed major holidays. Hair system services 75 min,
              haircuts 45 min.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}