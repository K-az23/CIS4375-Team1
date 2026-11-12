import { useEffect, useState } from 'react';
import { Check, Minus, Plus, Trash2, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { appointmentStatusLabel, customerName, formatAppointment, todayIso } from '../../api/format';
import { allServices, serviceCategories, priceToNumber } from '../../data/services';
import { money } from '../../data/sampleData';

// Services are paid in person, however the salon takes payment; the app doesn't
// charge or record them. Checkout marks the visit done and deducts the products used.

function findService(name, fallbackPrice) {
  return allServices.find((s) => s.name === name)
    ?? { name, price: fallbackPrice != null ? `$${fallbackPrice}` : '$0' };
}

function startState(appt) {
  const name = appt?.service?.service_name;
  return {
    services: name ? [findService(name, appt.service.price)] : [],
    products: [],
  };
}

export default function AppointmentCheckout() {
  const [appointments, setAppointments] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(startState(null));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const today = todayIso();
    api(`/api/admin/appointments?start=${today}&end=${today}`)
      .then((data) => {
        const list = data.appointments ?? [];
        setAppointments(list);
        if (list.length) {
          setSelectedId(list[0].setmore_booking_id);
          setForm(startState(list[0]));
        }
      })
      .catch((err) => setError(err.message));
    api('/api/admin/inventory-items')
      .then((data) => setInventory(data.items.filter((i) => i.is_active && i.item_type !== 'bulk')))
      .catch(() => {});
  }, []);

  const appt = (appointments ?? []).find((a) => a.setmore_booking_id === selectedId);
  const total = form.services.reduce((sum, s) => sum + priceToNumber(s.price), 0);
  const finished = appt && appt.status !== 'booked';

  function select(a) {
    setSelectedId(a.setmore_booking_id);
    setForm(startState(a));
    setMessage('');
    setError('');
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

  // Replaces the appointment in the list with the backend's updated copy.
  function applyUpdate(updated) {
    setAppointments((list) => list.map((a) => (a.setmore_booking_id === updated.setmore_booking_id ? updated : a)));
  }

  async function complete() {
    setError('');
    setMessage('');
    setWorking(true);
    try {
      const data = await api(`/api/admin/appointments/${appt.setmore_booking_id}/complete`, { method: 'POST' });
      applyUpdate(data.appointment);
      // Each unit used is one "use" in inventory, so it shows up in the inventory report.
      let deducted = 0;
      for (const p of form.products) {
        for (let i = 0; i < p.qty; i += 1) {
          await api(`/api/admin/inventory-items/${p.itemId}/use`, { method: 'POST' });
          deducted += 1;
        }
      }
      setMessage(`Visit completed. Collect ${money(total)} in person. ${deducted} product${deducted === 1 ? '' : 's'} deducted from inventory.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  async function noShow() {
    setError('');
    setMessage('');
    setWorking(true);
    try {
      const data = await api(`/api/admin/appointments/${appt.setmore_booking_id}/no-show`, { method: 'POST' });
      applyUpdate(data.appointment ?? { ...appt, status: 'no_show' });
      setMessage(`${customerName(appt.customer)} marked as a no-show. No fee is charged.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  if (appointments === null || !appt) {
    return (
      <>
        <DashboardHeader eyebrow="Billing" title="Checkout & billing" subtitle="Complete today's appointments and log products used." showIcons />
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
        {!error && (
          <Panel title="Today">
            <p className="muted">{appointments === null ? 'Loading…' : 'No appointments today. Bookings appear here after a sync on the Calendar page.'}</p>
          </Panel>
        )}
      </>
    );
  }

  return (
    <>
      <DashboardHeader eyebrow="Billing" title="Checkout & billing" subtitle="Complete today's appointments and log products used." showIcons />

      <div className="checkout-grid">
        <Panel title="Today">
          <div className="appt-list">
            {appointments.map((a) => (
              <button key={a.setmore_booking_id} className={`appt-item ${a.setmore_booking_id === selectedId ? 'is-selected' : ''}`} onClick={() => select(a)}>
                <span className="appt-item__top"><span>{formatAppointment(a.appointment_time, 'time')}</span><StatusBadge status={appointmentStatusLabel(a.status)} /></span>
                <span className="appt-item__name">{customerName(a.customer)}</span>
                <span className="small muted">{a.service?.service_name ?? '—'}</span>
              </button>
            ))}
          </div>
        </Panel>

        <div className="page-stack">
          {message && <p className="notice"><Check size={16} /> {message}</p>}
          {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

          <Panel title={`${customerName(appt.customer)} · ${formatAppointment(appt.appointment_time, 'time')}`}>
            <div className="line-items">
              {form.services.map((s, i) => (
                <div key={`${s.name}-${i}`} className="line-item">
                  <span>{s.name}</span>
                  <span>{s.price}</span>
                  <button className="icon-btn" aria-label={`Remove ${s.name}`} onClick={() => removeService(i)} disabled={finished}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
              <label htmlFor="add-service">Add a service</label>
              <select id="add-service" value="" onChange={(e) => addService(e.target.value)} disabled={finished}>
                <option value="">Choose a service…</option>
                {serviceCategories.map((c) => (
                  <optgroup key={c.id} label={c.label}>
                    {c.services.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.price})</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="total-row">
              <span className="muted">Total to collect</span>
              <strong>{money(total)}</strong>
            </div>
          </Panel>

          <Panel title="Products used">
            <p className="field-hint" style={{ margin: '4px 0 8px' }}><Info size={13} style={{ verticalAlign: '-2px' }} /> Add what was used; it's deducted from inventory when you complete the visit.</p>
            <div className="line-items">
              {form.products.map((p) => {
                const item = inventory.find((i) => i.item_id === p.itemId);
                return (
                  <div key={p.itemId} className="line-item">
                    <span>{item ? [item.brand, item.item_name].filter(Boolean).join(' ') : `Item #${p.itemId}`}</span>
                    <span className="qty">
                      <button aria-label="Less" onClick={() => changeQty(p.itemId, -1)} disabled={finished}><Minus size={14} /></button>
                      <span>{p.qty}</span>
                      <button aria-label="More" onClick={() => changeQty(p.itemId, 1)} disabled={finished}><Plus size={14} /></button>
                    </span>
                    <span />
                  </div>
                );
              })}
            </div>
            <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
              <label htmlFor="add-product">Add a product</label>
              <select id="add-product" value="" onChange={(e) => addProduct(e.target.value)} disabled={finished}>
                <option value="">Choose a product…</option>
                {inventory.map((i) => <option key={i.item_id} value={i.item_id}>{[i.brand, i.item_name].filter(Boolean).join(' ')}</option>)}
              </select>
            </div>
          </Panel>

          <Panel title="Finish visit">
            <p className="field-hint" style={{ marginTop: 8 }}>Payment for services is taken in person.</p>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-dark" onClick={complete} disabled={finished || working}>
                Complete visit
              </button>
              <button className="btn btn-outline" onClick={noShow} disabled={finished || working}>
                Mark no-show
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
