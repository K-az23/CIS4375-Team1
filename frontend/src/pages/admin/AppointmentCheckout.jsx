import { useState } from 'react';
import { Check, Minus, Plus, Trash2, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { allServices, serviceCategories, priceToNumber } from '../../data/services';
import { todaysAppointments, inventoryItems, usageHistory, usualUsageByService, money } from '../../data/sampleData';

const perUseItems = inventoryItems.filter((i) => i.type === 'per-use');
const hairSystemServices = serviceCategories.find((c) => c.id === 'systems').services.map((s) => s.name);
const NO_SHOW_FEE = 50;

function findService(name) {
  return allServices.find((s) => s.name === name) ?? { name, price: '$0' };
}

function prefillProducts(appt) {
  const service = appt.services[0];
  const own = usageHistory[`${appt.customer}|${service}`];
  if (own) return { items: own, source: `Pre-filled from ${appt.customer.split(' ')[0]}'s last ${service.toLowerCase()}` };
  const usual = usualUsageByService[service];
  if (usual) return { items: usual, source: `Pre-filled with usual amounts for ${service.toLowerCase()}` };
  return { items: [], source: 'No product history for this service' };
}

function startState(appt) {
  const prefill = prefillProducts(appt);
  return {
    services: appt.services.map(findService),
    products: prefill.items.map((p) => ({ ...p })),
    source: prefill.source,
    payment: 'card',
  };
}

export default function AppointmentCheckout() {
  const [selectedId, setSelectedId] = useState(todaysAppointments[0].id);
  const [form, setForm] = useState(startState(todaysAppointments[0]));
  const [done, setDone] = useState({}); 
  const [message, setMessage] = useState('');

  const appt = todaysAppointments.find((a) => a.id === selectedId);
  const total = form.services.reduce((sum, s) => sum + priceToNumber(s.price), 0);
  const isHairSystem = form.services.some((s) => hairSystemServices.includes(s.name));

  function select(a) {
    setSelectedId(a.id);
    setForm(startState(a));
    setMessage('');
  }

  function addService(name) {
    if (!name) return;
    setForm({ ...form, services: [...form.services, findService(name)] });
  }

  function removeService(index) {
    setForm({ ...form, services: form.services.filter((_, i) => i !== index) });
  }

  function changeQty(itemId, change) {
    const products = form.products
      .map((p) => (p.itemId === itemId ? { ...p, qty: p.qty + change } : p))
      .filter((p) => p.qty > 0);
    setForm({ ...form, products });
  }

  function addProduct(id) {
    const itemId = Number(id);
    if (!itemId || form.products.some((p) => p.itemId === itemId)) return;
    setForm({ ...form, products: [...form.products, { itemId, qty: 1 }] });
  }

  function complete() {
    setDone({ ...done, [appt.id]: 'Paid' });
    const how = form.payment === 'card' ? `charged to ${appt.card}` : 'recorded as cash';
    setMessage(`${money(total)} ${how}. Receipt emailed and ${form.products.length} products deducted from inventory.`);
  }

  function noShow() {
    setDone({ ...done, [appt.id]: 'No-show' });
    setMessage(`${money(NO_SHOW_FEE)} no-show fee charged to ${appt.card}.`);
  }

  const status = done[appt.id];

  return (
    <>
      <DashboardHeader eyebrow="Billing" title="Checkout & billing" subtitle="Complete today's appointments, add services and log products used." showIcons />

      <div className="checkout-grid">
        <Panel title="Today">
          <div className="appt-list">
            {todaysAppointments.map((a) => (
              <button key={a.id} className={`appt-item ${a.id === selectedId ? 'is-selected' : ''}`} onClick={() => select(a)}>
                <span className="appt-item__top"><span>{a.time}</span><StatusBadge status={done[a.id] ?? a.status} /></span>
                <span className="appt-item__name">{a.customer}</span>
                <span className="small muted">{a.services.join(', ')}</span>
              </button>
            ))}
          </div>
        </Panel>

        <div className="page-stack">
          {message && <p className="notice"><Check size={16} /> {message}</p>}

          <Panel title={`${appt.customer} · ${appt.time}`}>
            <div className="line-items">
              {form.services.map((s, i) => (
                <div key={`${s.name}-${i}`} className="line-item">
                  <span>{s.name}</span>
                  <span>{s.price}</span>
                  <button className="icon-btn" aria-label={`Remove ${s.name}`} onClick={() => removeService(i)} disabled={Boolean(status)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
              <label htmlFor="add-service">Add a service</label>
              <select id="add-service" value="" onChange={(e) => addService(e.target.value)} disabled={Boolean(status)}>
                <option value="">Choose a service…</option>
                {serviceCategories.map((c) => (
                  <optgroup key={c.id} label={c.label}>
                    {c.services.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.price})</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="total-row">
              <span className="muted">Total</span>
              <strong>{money(total)}</strong>
            </div>
          </Panel>

          <Panel title="Products used">
            <p className="field-hint" style={{ margin: '4px 0 8px' }}><Info size={13} style={{ verticalAlign: '-2px' }} /> {form.source}. Adjust if needed.</p>
            <div className="line-items">
              {form.products.map((p) => {
                const item = inventoryItems.find((i) => i.id === p.itemId);
                return (
                  <div key={p.itemId} className="line-item">
                    <span>{item.name}</span>
                    <span className="qty">
                      <button aria-label="Less" onClick={() => changeQty(p.itemId, -1)} disabled={Boolean(status)}><Minus size={14} /></button>
                      <span>{p.qty}</span>
                      <button aria-label="More" onClick={() => changeQty(p.itemId, 1)} disabled={Boolean(status)}><Plus size={14} /></button>
                    </span>
                    <span />
                  </div>
                );
              })}
            </div>
            <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
              <label htmlFor="add-product">Add a product</label>
              <select id="add-product" value="" onChange={(e) => addProduct(e.target.value)} disabled={Boolean(status)}>
                <option value="">Choose a product…</option>
                {perUseItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="pay-options" style={{ marginTop: 8 }}>
              <button className={`choice ${form.payment === 'card' ? 'is-selected' : ''}`} onClick={() => setForm({ ...form, payment: 'card' })}>
                Card on file · {appt.card}
              </button>
              <button className={`choice ${form.payment === 'cash' ? 'is-selected' : ''}`} onClick={() => setForm({ ...form, payment: 'cash' })}>
                Cash
              </button>
            </div>
            <div className="row" style={{ marginTop: 20 }}>
              <button className="btn btn-dark" onClick={complete} disabled={Boolean(status) || form.services.length === 0}>
                Complete &amp; charge {money(total)}
              </button>
              {isHairSystem && (
                <button className="btn btn-outline" onClick={noShow} disabled={Boolean(status)}>
                  Mark no-show ({money(NO_SHOW_FEE)} fee)
                </button>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}