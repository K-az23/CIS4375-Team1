import { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ChoiceGroup from '../../components/ChoiceGroup';
import { hairOptions, pricing, specFields } from '../../data/hairOptions';
import { isDemoMode } from '../../context/authUtils.js';
import { getPurchases } from '../../services/purchasing';
import { hairOrders, customers, money } from '../../data/sampleData';

const filters = ['All', 'Invoice sent', 'Pending', 'Ordered', 'Received'];
const nextStatus = { Pending: 'Ordered', Ordered: 'Received' };
const customFields = specFields;
const emptySpecs = Object.fromEntries(customFields.map((f) => [f.key, null]));

function DemoPurchasingTracker() {
  const [orders, setOrders] = useState(hairOrders);
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [customer, setCustomer] = useState('');
  const [specs, setSpecs] = useState(emptySpecs);
  const [price, setPrice] = useState(pricing.customFrom);
  const [message, setMessage] = useState('');

  const visible = filter === 'All' ? orders : orders.filter((o) => o.status === filter);
  const formComplete = customer && customFields.every((f) => specs[f.key] !== null);

  function advance(id) {
    setOrders(orders.map((o) => (o.id === id && nextStatus[o.status] ? { ...o, status: nextStatus[o.status] } : o)));
  }

  function sendInvoice(e) {
    e.preventDefault();
    const id = `INV-${1034 + orders.length}`;
    const summary = `${specs.color} · ${specs.greyPercent}% · ${specs.density} · ${specs.dimensions}`;
    setOrders([{ id, customer, type: 'Custom', specs: summary, amount: Number(price), date: 'Today', status: 'Invoice sent' }, ...orders]);
    setMessage(`Invoice ${id} for ${money(price)} sent to ${customer}.`);
    setShowForm(false);
    setCustomer('');
    setSpecs(emptySpecs);
  }

  const columns = [
    { key: 'id', label: 'Order', nowrap: true },
    { key: 'customer', label: 'Client', nowrap: true },
    { key: 'type', label: 'Type' },
    { key: 'specs', label: 'Specs' },
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (r) => nextStatus[r.status]
        ? <button className="btn btn-outline btn-sm" onClick={() => advance(r.id)}>Mark {nextStatus[r.status].toLowerCase()}</button>
        : null,
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

        {showForm && (
          <Panel title="Custom order from consultation">
            <form onSubmit={sendInvoice}>
              <div className="form-row" style={{ margin: '12px 0 4px' }}>
                <div className="field">
                  <label htmlFor="client">Client</label>
                  <select id="client" required value={customer} onChange={(e) => setCustomer(e.target.value)}>
                    <option value="" disabled>Select a client</option>
                    {customers.map((c) => <option key={c.email}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="price">Invoice amount ($)</label>
                  <input id="price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
              {customFields.map((field) => (
                <ChoiceGroup
                  key={field.key}
                  field={field}
                  options={hairOptions[field.key]}
                  value={specs[field.key]}
                  onChange={(key, value) => setSpecs({ ...specs, [key]: value })}
                />
              ))}
              <div className="row" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-gold" disabled={!formComplete}>Send invoice</button>
                <span className="field-hint">The system is ordered after the client pays.</span>
              </div>
            </form>
          </Panel>
        )}

        <div className="tabs" style={{ justifySelf: 'start' }}>
          {filters.map((f) => (
            <button key={f} className={`tabs__btn ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <Panel title={`${visible.length} orders`}>
          <DataTable columns={columns} rows={visible} emptyMessage="No orders with this status." />
        </Panel>
      </div>
    </>
  );
}

const purchaseStatuses = {
  pending: 'Pending',
  ordered: 'Ordered',
  received: 'Received',
  cancelled: 'Cancelled',
};
const purchaseFilters = ['All', ...Object.values(purchaseStatuses)];
const purchaseDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'America/Chicago',
});

function formatOrderedAt(value) {
  if (!value) return '—';

  // Until the API contract is confirmed, timezone-less timestamps are treated as UTC.
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : purchaseDate.format(date);
}

const purchaseColumns = [
  { key: 'id', label: 'Purchase', nowrap: true },
  { key: 'supplier', label: 'Supplier' },
  { key: 'item', label: 'Item' },
  { key: 'quantity', label: 'Quantity', align: 'right' },
  { key: 'date', label: 'Ordered', nowrap: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

function toPurchaseRow(purchase) {
  return {
    id: `#${purchase.purchase_id}`,
    supplier: purchase.supplier_name || '—',
    item: purchase.item_name || '—',
    quantity: purchase.quantity ?? '—',
    date: formatOrderedAt(purchase.ordered_at),
    status: purchaseStatuses[purchase.status] ?? 'Unknown',
  };
}

function LivePurchasingTracker() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadPurchases() {
      try {
        const purchases = await getPurchases({ signal: controller.signal });
        if (!Array.isArray(purchases)) {
          throw new Error('The server returned an invalid purchasing list.');
        }

        if (!controller.signal.aborted) setRows(purchases.map(toPurchaseRow));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadPurchases();
    return () => controller.abort();
  }, []);

  const visible = rows?.filter((row) => filter === 'All' || row.status === filter);

  return (
    <>
      <DashboardHeader eyebrow="Purchasing" title="Purchasing tracker" subtitle="Supplier orders and their current status." showIcons />
      <div className="page-stack">
        {!rows && !error && <p role="status">Loading purchases…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load purchases. {error}</p>}
        {visible && (
          <>
            <div className="tabs" style={{ justifySelf: 'start' }} role="group" aria-label="Filter purchases by status">
              {purchaseFilters.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={`tabs__btn ${filter === status ? 'is-active' : ''}`}
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <Panel title={`${visible.length} purchases`}>
              <DataTable
                columns={purchaseColumns}
                rows={visible}
                emptyMessage={rows.length === 0 ? 'No purchases yet.' : 'No purchases with this status.'}
              />
            </Panel>
          </>
        )}
      </div>
    </>
  );
}

export default function PurchasingTracker() {
  return isDemoMode ? <DemoPurchasingTracker /> : <LivePurchasingTracker />;
}
