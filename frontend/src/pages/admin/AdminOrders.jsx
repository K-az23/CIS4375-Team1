import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import OrderForm from '../../components/OrderForm';
import OrderSummary from '../../components/OrderSummary';
import { getAdminCustomers } from '../../services/users';
import { getAdminOrders, updateOrderStatus, orderError, orderStatuses, orderDate } from '../../services/orders';
import { isDemoMode } from '../../context/authUtils.js';
import { money } from '../../data/sampleData';
import OrderAppointment from '../../components/OrderAppointment';

const statusLabels = { ...orderStatuses, invoice_sent: 'Invoice sent' };

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (isDemoMode) return;
    const controller = new AbortController();
    async function loadOrders() {
      try {
        const result = await getAdminOrders({ status, userId, signal: controller.signal });
        if (!controller.signal.aborted) setOrders(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(orderError(error));
      }
    }
    async function loadCustomers() {
      try {
        const result = await getAdminCustomers({ signal: controller.signal });
        if (!controller.signal.aborted) setCustomers(result);
      } catch (error) {
        if (!controller.signal.aborted) setCustomerError(orderError(error));
      }
    }
    loadOrders();
    loadCustomers();
    return () => controller.abort();
  }, [status, userId, refresh]);

  function reload(nextStatus = status, nextUser = userId) {
    setStatus(nextStatus);
    setUserId(nextUser);
    setOrders(null);
    setSelected(null);
    setError('');
    setCustomerError('');
    setRefresh((old) => old + 1);
  }

  async function changeStatus(order, nextStatus) {
    const question = nextStatus === 'cancelled'
      ? `Cancel order #${order.order_id}? Paid orders must be refunded first.`
      : `Mark order #${order.order_id} as ${nextStatus}?`;
    if (busy || !window.confirm(question)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await updateOrderStatus(order.order_id, nextStatus);
      // Use the saved server response. Do not pretend a failed change succeeded.
      setOrders((old) => old.map((item) => item.order_id === saved.order_id ? saved : item)
        .filter((item) => !status || item.order_status === status));
      if (selected?.order_id === saved.order_id) setSelected(saved);
      setMessage(`Order #${saved.order_id}: ${statusLabels[saved.order_status]}.`);
    } catch (error) {
      setError(orderError(error));
    } finally {
      setBusy(false);
    }
  }

  function created(order) {
    setShowForm(false);
    setMessage(`Invoice #${order.order_id} created and awaiting payment.`);
    reload('', '');
  }

  const columns = [
    { key: 'order_id', label: 'Order', render: (row) => `#${row.order_id}` },
    { key: 'customer', label: 'Customer', render: (row) => `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim() },
    { key: 'system_label', label: 'System', render: (row) => row.system_label || row.order_type },
    { key: 'placed_at', label: 'Date', nowrap: true, render: (row) => orderDate(row.placed_at) },
    { key: 'price', label: 'Amount', align: 'right', render: (row) => money(row.price) },
    { key: 'order_status', label: 'Status', render: (row) => <StatusBadge status={statusLabels[row.order_status] || row.order_status} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row">
      <button className="btn btn-outline btn-sm" disabled={busy || showForm} onClick={() => setSelected(row)}>Details</button>
      {row.order_status === 'pending' && <button className="btn btn-outline btn-sm" disabled={busy || showForm}
        onClick={() => changeStatus(row, 'ordered')}>Mark ordered</button>}
      {row.order_status === 'ordered' && <button className="btn btn-outline btn-sm" disabled={busy || showForm}
        onClick={() => changeStatus(row, 'received')}>Mark received</button>}
      {['invoice_sent', 'pending'].includes(row.order_status) && <button className="btn btn-outline btn-sm" disabled={busy || showForm}
        onClick={() => changeStatus(row, 'cancelled')}>Cancel order</button>}
    </div> },
  ];

  return (
    <>
      <DashboardHeader eyebrow="Orders" title="Hair orders" subtitle="Customer invoices and orders placed with the supplier." showIcons>
        {!showForm && !isDemoMode && <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => {
          setSelected(null); setMessage(''); setShowForm(true);
        }}>New invoice</button>}
      </DashboardHeader>
      {isDemoMode ? <p className="muted">Sign in with a live admin account to manage orders.</p> : (
        <div className="page-stack">
          {message && <p role="status" className="notice">{message}</p>}
          {showForm && <Panel title="Invoice from consultation">
            <OrderForm admin onSaved={created} onClose={() => setShowForm(false)} />
          </Panel>}
          <div className="form-row">
            <div className="field">
              <label htmlFor="orders-status">Status</label>
              <select id="orders-status" value={status} disabled={busy || showForm} onChange={(event) => reload(event.target.value, userId)}>
                <option value="">All statuses</option>
                {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="orders-customer">Customer</label>
              <select id="orders-customer" value={userId} disabled={busy || showForm} onChange={(event) => reload(status, event.target.value)}>
                <option value="">All customers</option>
                {customers.map((user) => <option key={user.user_id} value={user.user_id}>{user.first_name} {user.last_name} — {user.email}</option>)}
              </select>
            </div>
          </div>
          {customerError && <p role="alert" className="notice notice--warning">Couldn’t load the customer filter. {customerError}</p>}
          <Panel title={orders ? `${orders.length} orders` : 'Orders'}>
            <button className="btn btn-outline btn-sm" disabled={busy || showForm} onClick={() => reload()}>Refresh orders</button>
            {!orders && !error && <p role="status">Loading orders…</p>}
            {error && <p role="alert" className="notice notice--warning">{error}</p>}
            {orders && <DataTable columns={columns} rows={orders.map((row) => ({ ...row, id: row.order_id }))} emptyMessage="No orders match these filters." />}
          </Panel>
          {selected && <Panel title={`Order #${selected.order_id}`}>
            <OrderSummary order={selected} />
            {selected.order_status === 'received' && <OrderAppointment order={selected} admin />}
            <button className="btn btn-outline" disabled={busy} onClick={() => setSelected(null)} style={{ marginTop: 12 }}>Close details</button>
          </Panel>}
        </div>
      )}
    </>
  );
}
