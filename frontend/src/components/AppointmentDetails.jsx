import { useEffect, useState } from 'react';
import Panel from './Panel';
import SpecList from './SpecList';
import { getAppointment, finishAppointment, appointmentDate, appointmentTime, appointmentStatuses, appointmentError } from '../services/appointments';

export default function AppointmentDetails({ id, admin = false, onSaved, onBusy, onClose }) {
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [checkedAt, setCheckedAt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await getAppointment(id, { admin, signal: controller.signal });
        if (!controller.signal.aborted) {
          setAppointment(data);
          setCheckedAt(Date.now());
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(appointmentError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [id, admin, refresh]);

  async function finalize(status) {
    const question = status === 'cancelled'
      ? 'Have you checked Setmore and confirmed this appointment was cancelled? A booking outside the sync date range is not a cancellation.'
      : status === 'no_show' ? 'Mark this appointment as a no-show and increase the customer’s no-show count? No fee will be charged.'
        : 'Mark this appointment as completed?';
    if (saving || !window.confirm(question)) return;
    setSaving(true);
    onBusy?.(true);
    setError('');
    try {
      const data = await finishAppointment(id, status);
      setAppointment(data);
      onSaved?.(data);
    } catch (error) {
      setError(appointmentError(error));
    } finally {
      setSaving(false);
      onBusy?.(false);
    }
  }

  const past = appointment && appointmentTime(appointment.appointment_time) <= checkedAt;
  const canFinish = admin && appointment?.status === 'booked' && past && !appointment.setmore_missing;
  return (
    <Panel title="Appointment details">
      {!appointment && !error && <p role="status">Loading appointment…</p>}
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      {appointment && <>
        {appointment.setmore_missing && <p className="notice notice--warning">This booking was not returned by the latest Setmore sync. Check Setmore before relying on this appointment.</p>}
        <SpecList rows={[
          ['Booking reference', appointment.setmore_booking_id],
          ['Date · Central Time', appointmentDate(appointment.appointment_time)],
          ['Service', appointment.service_name || 'Service unavailable'],
          ['Status', appointmentStatuses[appointment.status] || appointment.status],
          ['Linked orders', appointment.linked_order_ids?.map((orderId) => `#${orderId}`).join(', ') || 'None'],
          ...(admin ? [['Customer', appointment.customer?.name || 'Setmore guest'], ['Email', appointment.customer?.email || '—'], ['Phone', appointment.customer?.phone || '—']] : []),
        ]} />
        {canFinish && <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-dark" disabled={saving} onClick={() => finalize('completed')}>Mark completed</button>
          <button className="btn btn-outline" disabled={saving} onClick={() => finalize('no_show')}>Mark no-show</button>
        </div>}
        {admin && appointment.status === 'booked' && appointment.setmore_missing && <button className="btn btn-outline" disabled={saving}
          onClick={() => finalize('cancelled')} style={{ marginTop: 12 }}>Confirm cancelled in Setmore</button>}
      </>}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-outline" disabled={saving} onClick={() => {
          setAppointment(null); setError(''); setRefresh((old) => old + 1);
        }}>Refresh details</button>
        <button className="btn btn-outline" disabled={saving} onClick={onClose}>Close details</button>
      </div>
    </Panel>
  );
}
