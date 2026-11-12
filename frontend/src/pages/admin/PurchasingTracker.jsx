import { useEffect, useState } from 'react';
import { Plus, Check, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ChoiceGroup from '../../components/ChoiceGroup';
import { api } from '../../api/client';
import { adminOrderStatusLabel, customerName, formatDate } from '../../api/format';
import { hairOptions, pricing, specFields } from '../../data/hairOptions';
import { money } from '../../data/sampleData';

const filters = [
  { label: 'All', status: null },
  { label: 'Invoice sent', status: 'invoice_sent' },
  { label: 'Pending', status: 'pending' },
  { label: 'Ordered', status: 'ordered' },
  { label: 'Received', status: 'received' },
];
// Pending means paid; Natasha then orders it from the vendor and marks it received when it arrives.
const nextStatus = { pending: 'ordered', ordered: 'received' };
// Full systems are measured at the consultation, so the size is typed instead of picked.
const choiceFields = specFields.filter((f) => f.key !== 'dimensions');
const emptySpecs = Object.fromEntries(specFields.map((f) => [f.key, f.key === 'dimensions' ? '' : null]));

function specSummary(o) {
  return [o.color_code, o.grey_percentage != null ? `${o.grey_percentage}%` : null, o.density, o.dimensions]
    .filter(Boolean)
    .join(' · ');
}

export default function PurchasingTracker() {
  const [orders, setOrders] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState('');
  const [specs, setSpecs] = useState(emptySpecs);
  const [price, setPrice] = useState(pricing.customFrom);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function loadOrders() {
    return api('/api/admin/hairpiece-orders')
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadOrders();
    api('/api/admin/users').then((data) => setCustomers(data.users)).catch(() => {});
  }, []);

  const active = filters.find((f) => f.label === filter);
  const all = orders ?? [];
  const visible = active.status ? all.filter((o) => o.order_status === active.status) : all;
  const formComplete = userId && specs.dimensions.trim() && choiceFields.every((f) => specs[f.key] !== null);

  async function changeStatus(order, status) {
    setError('');
    setMessage('');
    try {
      await api(`/api/admin/hairpiece-orders/${order.order_id}/status`, { method: 'PATCH', body: { status } });
      setMessage(`Order #${order.order_id} marked ${adminOrderStatusLabel(status).toLowerCase()}.`);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendInvoice(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { order } = await api('/api/admin/hairpiece-orders', {
        method: 'POST',
        body: {
          user_id: Number(userId),
          system_type: 'full',
          price: Number(price),
          specs: {
            hair_type: specs.hairType,
            base_type: specs.baseType,
            skin_thickness: specs.skinThickness,
            color: specs.color,
            grey_percent: specs.greyPercent,
            density: specs.density,
            dimensions: specs.dimensions.trim(),
          },
        },
      });
      setMessage(`Invoice #${order.order_id} for ${money(order.price)} sent to ${customerName(order.customer)}. They can pay it from Orders & Billing.`);
      setShowForm(false);
      setUserId('');
      setSpecs(emptySpecs);
      setPrice(pricing.customFrom);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = [
    { key: 'order_id', label: 'Order', nowrap: true, render: (r) => `#${r.order_id}` },
    { key: 'customer', label: 'Client', nowrap: true, render: (r) => customerName(r.customer) },
    { key: 'type', label: 'Type', render: (r) => (r.order_type === 'full' ? 'Custom' : 'Area') },
    { key: 'specs', label: 'Specs', render: specSummary },
    { key: 'placed_at', label: 'Date', nowrap: true, render: (r) => formatDate(r.placed_at) },
    { key: 'price', label: 'Amount', align: 'right', render: (r) => money(r.price) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={adminOrderStatusLabel(r.order_status)} /> },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (r) => {
        if (nextStatus[r.order_status]) {
          const next = nextStatus[r.order_status];
          return <button className="btn btn-outline btn-sm" onClick={() => changeStatus(r, next)}>Mark {next}</button>;
        }
        if (r.order_status === 'invoice_sent') {
          return <button className="btn btn-outline btn-sm" onClick={() => changeStatus(r, 'cancelled')}>Cancel invoice</button>;
        }
        return null;
      },
    },
  ];

  return (
    <>
      <DashboardHeader eyebrow="Purchasing" title="Hair orders" subtitle="Orders can't be returned once placed with the vendor." showIcons>
        <button className="btn btn-dark btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? 'Close form' : 'New custom order'}
        </button>
      </DashboardHeader>

      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

        {showForm && (
          <Panel title="Custom order from consultation">
            <form onSubmit={sendInvoice}>
              <div className="form-row" style={{ margin: '12px 0 4px' }}>
                <div className="field">
                  <label htmlFor="client">Client</label>
                  <select id="client" required value={userId} onChange={(e) => setUserId(e.target.value)}>
                    <option value="" disabled>Select a client</option>
                    {customers.map((c) => <option key={c.user_id} value={c.user_id}>{customerName(c)} ({c.email})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="price">Invoice amount ($)</label>
                  <input id="price" type="number" min={pricing.customFrom} step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
                  <span className="field-hint">Full systems start at {money(pricing.customFrom)}.</span>
                </div>
              </div>
              {choiceFields.map((field) => (
                <ChoiceGroup
                  key={field.key}
                  field={field}
                  options={hairOptions[field.key]}
                  value={specs[field.key]}
                  onChange={(key, value) => setSpecs({ ...specs, [key]: value })}
                />
              ))}
              <div className="field">
                <label htmlFor="dimensions">Dimensions</label>
                <input id="dimensions" required placeholder="e.g. 8 x 10 front, measured at consultation" value={specs.dimensions} onChange={(e) => setSpecs({ ...specs, dimensions: e.target.value })} />
              </div>
              <div className="row" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-gold" disabled={!formComplete}>Send invoice</button>
                <span className="field-hint">The system is ordered after the client pays.</span>
              </div>
            </form>
          </Panel>
        )}

        <div className="tabs" style={{ justifySelf: 'start' }}>
          {filters.map((f) => (
            <button key={f.label} className={`tabs__btn ${filter === f.label ? 'is-active' : ''}`} onClick={() => setFilter(f.label)}>{f.label}</button>
          ))}
        </div>

        <Panel title={`${visible.length} orders`}>
          <DataTable
            columns={columns}
            rows={visible.map((o) => ({ ...o, id: o.order_id }))}
            emptyMessage={orders === null && !error ? 'Loading…' : 'No orders with this status.'}
          />
        </Panel>
      </div>
    </>
  );
}
