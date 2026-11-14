import { useEffect, useState } from 'react';
import { getAppointments, getAdminAppointments, getOrderAppointment, linkOrderAppointment, appointmentDate, appointmentTime, appointmentStatuses, appointmentError } from '../services/appointments';

export default function OrderAppointment({ order, admin = false }) {
  const [appointments, setAppointments] = useState([]);
  const [linked, setLinked] = useState(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const current = await getOrderAppointment(order.order_id, { signal: controller.signal });
        const rows = admin
          ? await getAdminAppointments({ userId: order.user_id, signal: controller.signal })
          : await getAppointments({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setLinked(current);
          setAppointments(rows.filter((item) => item.status === 'booked' && !item.setmore_missing && appointmentTime(item.appointment_time) > Date.now()));
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(appointmentError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [order.order_id, order.user_id, admin, refresh]);

  async function save(event) {
    event.preventDefault();
    if (saving || !selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await linkOrderAppointment(order.order_id, selected);
      setLinked(result);
      setSelected('');
      setMessage('Appointment linked to this order.');
    } catch (error) {
      setError(appointmentError(error));
    } finally {
      setSaving(false);
    }
  }

  const canLink = !linked || linked.status === 'cancelled';
  return (
    <div className="stack" style={{ marginTop: 20 }}>
      <h4>Appointment for this received order</h4>
      {loading && <p role="status">Loading appointments…</p>}
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      {message && <p role="status" className="notice">{message}</p>}
      {linked && <p>{appointmentDate(linked.appointment_time)} · {linked.service_name} · {appointmentStatuses[linked.status]}{linked.setmore_missing ? ' · Check Setmore' : ''}</p>}
      {!loading && canLink && <form className="form" onSubmit={save}>
        <div className="field">
          <label htmlFor="order-appointment">Matching customer appointment</label>
          <select id="order-appointment" value={selected} disabled={saving} required onChange={(event) => setSelected(event.target.value)}>
            <option value="">Select an upcoming appointment</option>
            {appointments.map((item) => <option key={item.setmore_booking_id} value={item.setmore_booking_id}>
              {appointmentDate(item.appointment_time)} · {item.service_name}
            </option>)}
          </select>
        </div>
        {appointments.length === 0 && <p className="field-hint">No confirmed upcoming appointments are available. Book in Setmore, then have the salon refresh its calendar.</p>}
        <button className="btn btn-gold" disabled={saving || !selected}>{saving ? 'Saving…' : 'Link appointment'}</button>
      </form>}
      {linked && !canLink && <p className="field-hint">Reschedule this booking in Setmore. If it is cancelled, a replacement can be linked after the calendar is updated.</p>}
      <div><button className="btn btn-outline btn-sm" disabled={saving} onClick={() => {
        setLoading(true); setError(''); setMessage(''); setRefresh((old) => old + 1);
      }}>Refresh appointment link</button></div>
    </div>
  );
}
