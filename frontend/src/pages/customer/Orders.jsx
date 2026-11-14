import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { customerOrders, money } from '../../data/sampleData';
import { getOrders, getOrder, cancelOrder, orderError, orderStatuses as liveStatuses, orderDate } from '../../services/orders';
import OrderForm from '../../components/OrderForm';
import OrderAppointment from '../../components/OrderAppointment';
import OrderSummary from '../../components/OrderSummary';
import InvoicePayment from '../../components/InvoicePayment';

const orderStatuses = {
  pending: 'Pending',
  ordered: 'Ordered',
  received: 'Received',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function formatPlacedAt(value) {
  if (!value) return '—';

  // The current order model serializes UTC timestamps without a timezone suffix.
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

function toRow(order) {
  const type = order.order_type?.trim().replace(/_/g, ' ');
  return {
    id: `#${order.order_id}`,
    product: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Hairpiece order',
    date: formatPlacedAt(order.placed_at),
    status: orderStatuses[order.order_status] ?? 'Unknown',
    amount: order.price,
  };
}

function DemoOrders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(isDemoMode ? customerOrders : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadOrders() {
      try {
        const orders = await getOrders({ signal: controller.signal });
        if (!Array.isArray(orders)) {
          throw new Error('The server returned an invalid orders list.');
        }

        if (!controller.signal.aborted) setRows(orders.map(toRow));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadOrders();
    return () => controller.abort();
  }, []);

  function payInvoice(order) {
    navigate('/checkout', {
      state: { order: { title: order.product, description: `Invoice ${order.id} from The Executive Parlor.`, price: order.amount } },
    });
  }

  const columns = [
    { key: 'id', label: 'Order', nowrap: true },
    { key: 'product', label: 'Item' },
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
  ];

  if (isDemoMode) {
    columns.push({
      key: 'action',
      label: '',
      align: 'right',
      render: (row) => row.status === 'Invoice due'
        ? <button className="btn btn-dark btn-sm" onClick={() => payInvoice(row)}>Pay invoice</button>
        : null,
    });
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Orders"
        title={isDemoMode ? 'Orders & invoices' : 'Orders'}
        subtitle={isDemoMode
          ? "Systems arrive at the salon about 10 days after payment. We'll text you when yours is received."
          : 'View your hairpiece orders and their current status.'}
      />
      <Panel title="All orders">
        {!rows && !error && <p role="status">Loading orders…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load orders. {error}</p>}
        {rows && <DataTable columns={columns} rows={rows} emptyMessage="No orders yet." />}
      </Panel>
    </>
  );
}


function CustomerOrderDetails({ id, onChanged, onBusy, onClose }) {
  const [showPayment, setShowPayment] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOrder() {
      try {
        const result = await getOrder(id, { signal: controller.signal });
        if (!controller.signal.aborted) setOrder(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(orderError(error));
      }
    }
    loadOrder();
    return () => controller.abort();
  }, [id, refresh]);

  async function cancel() {
    if (busy || !window.confirm(`Cancel unpaid order #${id}?`)) return;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      const saved = await cancelOrder(id);
      setOrder(saved);
      onChanged(saved);
    } catch (error) {
      setError(orderError(error));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <Panel title={`Order #${id}`}>
      {!order && !error && <p role="status">Loading order…</p>}
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      {order && <OrderSummary order={order} />}
      {order?.order_status === 'received' && <OrderAppointment order={order} />}
      {order?.order_status === 'invoice_sent' && !showPayment && <div style={{ marginTop: 12 }}>
        <button className="btn btn-gold" disabled={busy} onClick={() => setShowPayment(true)}>Pay invoice</button>
        <p className="field-hint">This invoice is unpaid. Only unpaid orders can be cancelled here.</p>
        <button className="btn btn-outline" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel unpaid order'}</button>
      </div>}
      {showPayment && order && <InvoicePayment order={order} onChanged={(saved) => { setOrder(saved); onChanged(saved); }}
        onBusy={(value) => { setBusy(value); onBusy(value); }} onClose={() => setShowPayment(false)} />}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-outline" disabled={busy} onClick={() => {
          setOrder(null); setError(''); setRefresh((old) => old + 1);
        }}>Refresh details</button>
        <button className="btn btn-outline" disabled={busy} onClick={onClose}>Close details</button>
      </div>
    </Panel>
  );
}

function LiveOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOrders() {
      try {
        const result = await getOrders({ signal: controller.signal });
        if (!controller.signal.aborted) setOrders(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(orderError(error));
      }
    }
    loadOrders();
    return () => controller.abort();
  }, [refresh]);

  function reload() {
    setOrders(null);
    setError('');
    setSelectedId(null);
    setRefresh((old) => old + 1);
  }

  function created(order) {
    setShowForm(false);
    setMessage(`Order #${order.order_id} created and awaiting payment.`);
    reload();
  }

  function changed(order) {
    setOrders((old) => old.map((item) => item.order_id === order.order_id ? order : item));
    setMessage(`Order #${order.order_id} updated.`);
  }

  const columns = [
    { key: 'order_id', label: 'Order', render: (row) => `#${row.order_id}` },
    { key: 'system_label', label: 'System', render: (row) => row.system_label || row.order_type },
    { key: 'placed_at', label: 'Date', nowrap: true, render: (row) => orderDate(row.placed_at) },
    { key: 'order_status', label: 'Status', render: (row) => <StatusBadge status={liveStatuses[row.order_status] || row.order_status} /> },
    { key: 'price', label: 'Amount', align: 'right', render: (row) => money(row.price) },
    { key: 'details', label: '', render: (row) => <button className="btn btn-outline btn-sm" disabled={busy || showForm}
      onClick={() => { setSelectedId(row.order_id); setMessage(''); }}>Details</button> },
  ];

  return (
    <>
      <DashboardHeader eyebrow="Orders" title="Orders & invoices" subtitle="View your orders or create a hair loss area system order.">
        {!showForm && <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => {
          setSelectedId(null); setMessage(''); setShowForm(true);
        }}>New area order</button>}
      </DashboardHeader>
      <div className="page-stack">
        {message && <p role="status" className="notice">{message}</p>}
        {showForm && <Panel title="New hair loss area system">
          <OrderForm onSaved={created} onClose={() => setShowForm(false)} />
        </Panel>}
        <Panel title="All orders">
          <button className="btn btn-outline btn-sm" disabled={busy || showForm} onClick={reload}>Refresh orders</button>
          {!orders && !error && <p role="status">Loading orders…</p>}
          {error && <p role="alert" className="notice notice--warning">Couldn’t load orders. {error}</p>}
          {orders && <DataTable columns={columns} rows={orders.map((row) => ({ ...row, id: row.order_id }))} emptyMessage="No orders yet." />}
        </Panel>
        {selectedId && <CustomerOrderDetails key={selectedId} id={selectedId} onChanged={changed} onBusy={setBusy} onClose={() => setSelectedId(null)} />}
      </div>
    </>
  );
}

export default function Orders() {
  return isDemoMode ? <DemoOrders /> : <LiveOrders />;
}
