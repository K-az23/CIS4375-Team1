import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ChoiceGroup from '../../components/ChoiceGroup';
import { hairOptions, pricing, specFields } from '../../data/hairOptions';
import { hairOrders, customers, money } from '../../data/sampleData';

const filters = ['All', 'Invoice sent', 'Pending', 'Ordered', 'Received'];
const nextStatus = { Pending: 'Ordered', Ordered: 'Received' };
const customFields = specFields;
const emptySpecs = Object.fromEntries(customFields.map((f) => [f.key, null]));

export default function PurchasingTracker() {
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