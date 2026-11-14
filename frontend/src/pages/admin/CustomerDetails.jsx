import { useEffect, useState } from 'react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import SpecList from '../../components/SpecList';
import { money } from '../../data/sampleData';
import {
  getAdminCustomer, updateAdminCustomer,
  getCustomerAppointments, getCustomerOrders,
  getCustomerPayments, getCustomerTimeline,
} from '../../services/users';

// Dates from Flask are UTC. Display them using the salon's time zone.
function showDate(value) {
  if (!value) return '—';
  let text = value;
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(text)) text = text + 'Z';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { timeZone: 'America/Chicago' });
}

function showStatus(value) {
  if (!value) return '—';
  const text = value.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function CustomerDetails({ userId, onUpdated, onClose, onBusyChange }) {
  const [customer, setCustomer] = useState(null);
  const [active, setActive] = useState(false);
  const [member, setMember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [appointments, setAppointments] = useState(null);
  const [orders, setOrders] = useState(null);
  const [payments, setPayments] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [appointmentError, setAppointmentError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [timelineError, setTimelineError] = useState('');

  // Load the selected customer's details and each history separately.
  // A failed history request should not hide the other sections.
  // Cancel old reads when the admin closes or changes the selected customer.
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    async function loadCustomer() {
      try {
        const saved = await getAdminCustomer(userId, options);
        if (!controller.signal.aborted) {
          setCustomer(saved);
          setActive(saved.is_active);
          setMember(saved.is_member);
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }
    async function loadAppointments() {
      try {
        const rows = await getCustomerAppointments(userId, options);
        if (!controller.signal.aborted) setAppointments(rows);
      } catch (error) {
        if (!controller.signal.aborted) setAppointmentError(error.message);
      }
    }
    async function loadOrders() {
      try {
        const rows = await getCustomerOrders(userId, options);
        if (!controller.signal.aborted) setOrders(rows);
      } catch (error) {
        if (!controller.signal.aborted) setOrderError(error.message);
      }
    }
    async function loadPayments() {
      try {
        const rows = await getCustomerPayments(userId, options);
        if (!controller.signal.aborted) setPayments(rows);
      } catch (error) {
        if (!controller.signal.aborted) setPaymentError(error.message);
      }
    }
    async function loadTimeline() {
      try {
        const rows = await getCustomerTimeline(userId, options);
        if (!controller.signal.aborted) setTimeline(rows);
      } catch (error) {
        if (!controller.signal.aborted) setTimelineError(error.message);
      }
    }
    loadCustomer();
    loadAppointments();
    loadOrders();
    loadPayments();
    loadTimeline();
    return () => controller.abort();
  }, [userId]);

  // The existing admin API allows membership and active-status changes.
  // Contact details remain in the customer's Account Settings form.
  async function saveSettings(event) {
    event.preventDefault();
    setMessage('');
    setSaveError('');
    if (customer.is_active && !active) {
      const confirmed = window.confirm('Deactivate this customer? They will be unable to sign in, but their history will remain.');
      if (!confirmed) return;
    }
    setSaving(true);
    onBusyChange(true);
    try {
      const saved = await updateAdminCustomer(userId, { is_active: active, is_member: member });
      setCustomer(saved);
      setActive(saved.is_active);
      setMember(saved.is_member);
      onUpdated(saved);
      setMessage('Customer settings saved.');
    } catch (error) {
      setSaveError(Object.values(error.details ?? {}).join(' ') || error.message);
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  function cancelChanges() {
    setActive(customer.is_active);
    setMember(customer.is_member);
    setMessage('');
    setSaveError('');
  }

  // These tables show records only. They do not charge, refund, book, or cancel.
  const appointmentColumns = [
    { key: 'appointment_time', label: 'Date', render: (row) => showDate(row.appointment_time) },
    { key: 'service_name', label: 'Service' },
    { key: 'status', label: 'Status', render: (row) => showStatus(row.status) },
  ];
  const orderColumns = [
    { key: 'order_id', label: 'Order', render: (row) => '#' + row.order_id },
    { key: 'placed_at', label: 'Date', render: (row) => showDate(row.placed_at) },
    { key: 'order_type', label: 'Type', render: (row) => showStatus(row.order_type) },
    { key: 'order_status', label: 'Status', render: (row) => showStatus(row.order_status) },
    { key: 'price', label: 'Amount', render: (row) => row.price == null ? '—' : money(row.price) },
  ];
  const paymentColumns = [
    { key: 'payment_id', label: 'Payment', render: (row) => '#' + row.payment_id },
    { key: 'charged_at', label: 'Date', render: (row) => showDate(row.charged_at) },
    { key: 'payment_type', label: 'Type', render: (row) => showStatus(row.payment_type) },
    { key: 'status', label: 'Status', render: (row) => showStatus(row.status) },
    { key: 'amount', label: 'Amount', render: (row) => row.amount == null ? '—' : money(row.amount) },
  ];
  const timelineColumns = [
    { key: 'date', label: 'Date', render: (row) => showDate(row.date) },
    { key: 'kind', label: 'Type' },
    { key: 'description', label: 'Record' },
    { key: 'status', label: 'Status', render: (row) => showStatus(row.status) },
    { key: 'amount', label: 'Amount', render: (row) => row.amount == null ? '—' : money(row.amount) },
  ];

  return (
    <div className="page-stack" style={{ marginTop: 24 }}>
      <div><button type="button" className="btn btn-outline" disabled={saving} onClick={onClose}>Close customer details</button></div>
      <Panel title="Customer details">
        {!customer && !error && <p role="status">Loading customer…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load customer. {error}</p>}
        {customer && (
          <div className="page-stack">
            <SpecList rows={[
              ['Name', customer.first_name + ' ' + customer.last_name],
              ['Email', customer.email],
              ['Phone', customer.phone],
              ['Account created', showDate(customer.created_at)],
              ['No-shows', customer.no_show_count ?? 0],
            ]} />
            {message && <p role="status" className="notice">{message}</p>}
            {saveError && <p role="alert" className="notice notice--warning">{saveError}</p>}
            <form className="form" onSubmit={saveSettings}>
              <div><label><input type="checkbox" checked={active} disabled={saving} onChange={(event) => { setActive(event.target.checked); setMessage(''); }} /> Active account</label></div>
              <div><label><input type="checkbox" checked={member} disabled={saving} onChange={(event) => { setMember(event.target.checked); setMessage(''); }} /> Member</label></div>
              <div className="row">
                <button className="btn btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save customer settings'}</button>
                <button type="button" className="btn btn-outline" disabled={saving} onClick={cancelChanges}>Cancel changes</button>
              </div>
            </form>
          </div>
        )}
      </Panel>

      <p className="field-hint">Dates are shown in Central Time. History sections are read-only.</p>
      <Panel title="Appointments">
        {!appointments && !appointmentError && <p role="status">Loading appointments…</p>}
        {appointmentError && <p role="alert" className="notice notice--warning">Couldn’t load appointments. {appointmentError}</p>}
        {appointments && <DataTable columns={appointmentColumns} rows={appointments} emptyMessage="No appointments for this customer." />}
      </Panel>
      <Panel title="Hairpiece orders">
        {!orders && !orderError && <p role="status">Loading orders…</p>}
        {orderError && <p role="alert" className="notice notice--warning">Couldn’t load orders. {orderError}</p>}
        {orders && <DataTable columns={orderColumns} rows={orders} emptyMessage="No orders for this customer." />}
      </Panel>
      <Panel title="Payments">
        {!payments && !paymentError && <p role="status">Loading payments…</p>}
        {paymentError && <p role="alert" className="notice notice--warning">Couldn’t load payments. {paymentError}</p>}
        {payments && <DataTable columns={paymentColumns} rows={payments} emptyMessage="No payments for this customer." />}
      </Panel>
      <Panel title="Customer timeline">
        {!timeline && !timelineError && <p role="status">Loading timeline…</p>}
        {timelineError && <p role="alert" className="notice notice--warning">Couldn’t load timeline. {timelineError}</p>}
        {timeline && <DataTable columns={timelineColumns} rows={timeline} emptyMessage="No dated records for this customer." />}
      </Panel>
    </div>
  );
}
