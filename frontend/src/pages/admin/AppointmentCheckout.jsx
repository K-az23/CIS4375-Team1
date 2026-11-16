import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, Trash2, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import {
  appointmentStatusLabel,
  customerName,
  formatAppointment,
  todayIso,
} from '../../api/format';
import {
  allServices,
  serviceCategories,
  priceToNumber,
} from '../../data/services';
import { money } from '../../data/sampleData';

// Record payments already collected in person.
// This page does not charge Stripe.
function findService(name, fallbackPrice) {
  if (fallbackPrice != null) {
    return { name, price: `$${fallbackPrice}` };
  }

  return allServices.find((service) => service.name === name)
    ?? { name, price: '$0' };
}

function startState(appointment) {
  const name = appointment?.service?.service_name;

  return {
    services: name
      ? [findService(name, appointment.service.price)]
      : [],
    products: [],
    amount: String(appointment?.service?.price ?? ''),
    method: 'cash',
    received: false,
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
  const actionLock = useRef(false);

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
      .catch((error) => setError(error.message));

    api('/api/admin/inventory-items')
      .then((data) => {
        setInventory(
          data.items.filter(
            (item) => item.is_active && item.item_type !== 'bulk'
          )
        );
      })
      .catch((error) => {
        setError(`Could not load inventory: ${error.message}`);
      });
  }, []);

  const appointment = (appointments ?? []).find(
    (item) => item.setmore_booking_id === selectedId
  );

  const total = form.services.reduce(
    (sum, service) => sum + priceToNumber(service.price),
    0
  );

  const finished = appointment && appointment.status !== 'booked';

  function select(item) {
    setSelectedId(item.setmore_booking_id);
    setForm(startState(item));
    setMessage('');
    setError('');
  }

  function addService(name) {
    if (!name) return;

    const services = [...form.services, findService(name)];
    const amount = services.reduce(
      (sum, service) => sum + priceToNumber(service.price),
      0
    );

    setForm({
      ...form,
      services,
      amount: amount.toFixed(2),
      received: false,
    });
  }

  function removeService(index) {
    const services = form.services.filter(
      (_, serviceIndex) => serviceIndex !== index
    );

    const amount = services.reduce(
      (sum, service) => sum + priceToNumber(service.price),
      0
    );

    setForm({
      ...form,
      services,
      amount: amount.toFixed(2),
      received: false,
    });
  }

  function changeQty(itemId, change) {
    const products = form.products
      .map((product) => (
        product.itemId === itemId
          ? { ...product, qty: product.qty + change }
          : product
      ))
      .filter((product) => product.qty > 0);

    setForm({ ...form, products });
  }

  function addProduct(id) {
    const itemId = Number(id);

    if (
      !itemId
      || form.products.some((product) => product.itemId === itemId)
    ) {
      return;
    }

    setForm({
      ...form,
      products: [...form.products, { itemId, qty: 1 }],
    });
  }

  function applyUpdate(updated) {
    setAppointments((list) => list.map((item) => (
      item.setmore_booking_id === updated.setmore_booking_id
        ? updated
        : item
    )));
  }

  async function complete() {
    if (actionLock.current || !appointment || finished) return;

    if (
      !form.received
      || !form.services.length
      || form.amount.trim() === ''
    ) {
      setError(
        'Choose a service, enter the amount and confirm payment was received.'
      );
      return;
    }

    actionLock.current = true;
    setError('');
    setMessage('');
    setWorking(true);

    try {
      // One request saves the receipt, stock deductions and completed visit.
      const data = await api(
        `/api/admin/appointments/${encodeURIComponent(
          appointment.setmore_booking_id
        )}/checkout`,
        {
          method: 'POST',
          body: {
            amount: form.amount,
            payment_method: form.method,
            payment_received: form.received,
            services: form.services.map((service) => service.name),
            products: form.products.map((product) => ({
              item_id: product.itemId,
              quantity: product.qty,
            })),
          },
        }
      );

      applyUpdate(data.appointment);

      setMessage(
        `Saved ${money(data.receipt.amount)} collected in person. `
        + `Product cost: ${money(data.receipt.product_cost)}. `
        + `After product cost: ${money(data.receipt.after_product_cost)}.`
      );
    } catch (error) {
      setError(
        `${error.message} If the connection was interrupted, `
        + 'refresh Calendar and Inventory before retrying.'
      );
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  async function noShow() {
    if (actionLock.current || !appointment || finished) return;

    actionLock.current = true;
    setError('');
    setMessage('');
    setWorking(true);

    try {
      const data = await api(
        `/api/admin/appointments/${encodeURIComponent(
          appointment.setmore_booking_id
        )}/no-show`,
        { method: 'POST' }
      );

      applyUpdate(data.appointment);

      setMessage(
        `${customerName(appointment.customer)} marked as a no-show. `
        + 'No fee is charged.'
      );
    } catch (error) {
      setError(error.message);
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  if (appointments === null || !appointment) {
    return (
      <>
        <DashboardHeader
          eyebrow="Billing"
          title="Checkout & billing"
          subtitle="Complete today's appointments and log products used."
          showIcons
        />

        {error && (
          <p role="alert" className="notice notice--warning">
            <Info size={16} /> {error}
          </p>
        )}

        {!error && (
          <Panel title="Today">
            <p className="muted">
              {appointments === null
                ? 'Loading…'
                : 'No appointments today. Bookings appear after a Calendar sync.'}
            </p>
          </Panel>
        )}
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Billing"
        title="Checkout & billing"
        subtitle="Complete today's appointments and log products used."
        showIcons
      />

      <div className="checkout-grid">
        <Panel title="Today">
          <div className="appt-list">
            {appointments.map((item) => (
              <button
                key={item.setmore_booking_id}
                className={`appt-item ${
                  item.setmore_booking_id === selectedId ? 'is-selected' : ''
                }`}
                onClick={() => select(item)}
                disabled={working}
              >
                <span className="appt-item__top">
                  <span>
                    {formatAppointment(item.appointment_time, 'time')}
                  </span>
                  <StatusBadge
                    status={appointmentStatusLabel(item.status)}
                  />
                </span>
                <span className="appt-item__name">
                  {customerName(item.customer)}
                </span>
                <span className="small muted">
                  {item.service?.service_name ?? '—'}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <div className="page-stack">
          {message && (
            <p role="status" className="notice">
              <Check size={16} /> {message}
            </p>
          )}

          {error && (
            <p role="alert" className="notice notice--warning">
              <Info size={16} /> {error}
            </p>
          )}

          <Panel
            title={`${customerName(appointment.customer)} · ${
              formatAppointment(appointment.appointment_time, 'time')
            }`}
          >
            <div className="line-items">
              {form.services.map((service, index) => (
                <div
                  key={`${service.name}-${index}`}
                  className="line-item"
                >
                  <span>{service.name}</span>
                  <span>{service.price}</span>
                  <button
                    className="icon-btn"
                    aria-label={`Remove ${service.name}`}
                    onClick={() => removeService(index)}
                    disabled={finished || working}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div
              className="field"
              style={{ marginTop: 16, maxWidth: 360 }}
            >
              <label htmlFor="add-service">Add a service</label>
              <select
                id="add-service"
                value=""
                onChange={(event) => addService(event.target.value)}
                disabled={finished || working}
              >
                <option value="">Choose a service…</option>
                {serviceCategories.map((category) => (
                  <optgroup key={category.id} label={category.label}>
                    {category.services.map((service) => (
                      <option key={service.name} value={service.name}>
                        {service.name} ({service.price})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="total-row">
              <span className="muted">Suggested service total</span>
              <strong>{money(total)}</strong>
            </div>
          </Panel>

          <Panel title="Products used">
            <p className="field-hint" style={{ margin: '4px 0 8px' }}>
              Add what was used. Stock is deducted when checkout is saved.
            </p>

            <div className="line-items">
              {form.products.map((product) => {
                const item = inventory.find(
                  (item) => item.item_id === product.itemId
                );

                return (
                  <div key={product.itemId} className="line-item">
                    <span>
                      {item
                        ? [item.brand, item.item_name].filter(Boolean).join(' ')
                        : `Item #${product.itemId}`}
                    </span>

                    <span className="qty">
                      <button
                        aria-label="Less"
                        onClick={() => changeQty(product.itemId, -1)}
                        disabled={finished || working}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{product.qty}</span>
                      <button
                        aria-label="More"
                        onClick={() => changeQty(product.itemId, 1)}
                        disabled={finished || working}
                      >
                        <Plus size={14} />
                      </button>
                    </span>
                    <span />
                  </div>
                );
              })}
            </div>

            <div
              className="field"
              style={{ marginTop: 16, maxWidth: 360 }}
            >
              <label htmlFor="add-product">Add a product</label>
              <select
                id="add-product"
                value=""
                onChange={(event) => addProduct(event.target.value)}
                disabled={finished || working}
              >
                <option value="">Choose a product…</option>
                {inventory.map((item) => (
                  <option key={item.item_id} value={item.item_id}>
                    {[item.brand, item.item_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </Panel>

          <Panel title="Finish visit">
            <p className="field-hint" style={{ marginTop: 8 }}>
              Payment is taken in person.
              Record it here only after receiving it.
            </p>

            <div className="form-row">
              <div className="field">
                <label htmlFor="amount-collected">
                  Amount collected ($)
                </label>
                <input
                  id="amount-collected"
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  value={form.amount}
                  disabled={finished || working}
                  onChange={(event) => setForm({
                    ...form,
                    amount: event.target.value,
                    received: false,
                  })}
                />
              </div>

              <div className="field">
                <label htmlFor="service-payment-method">Paid with</label>
                <select
                  id="service-payment-method"
                  value={form.method}
                  disabled={finished || working}
                  onChange={(event) => setForm({
                    ...form,
                    method: event.target.value,
                    received: false,
                  })}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card paid in person</option>
                </select>
              </div>
            </div>

            <label>
              <input
                type="checkbox"
                checked={form.received}
                disabled={finished || working}
                onChange={(event) => setForm({
                  ...form,
                  received: event.target.checked,
                })}
              />
              {' '}I confirm this payment was received in person.
            </label>

            <div className="row" style={{ marginTop: 16 }}>
              <button
                className="btn btn-dark"
                onClick={complete}
                disabled={
                  finished
                  || working
                  || !form.received
                  || !form.services.length
                }
              >
                {working ? 'Saving…' : 'Record payment & complete visit'}
              </button>
              <button
                className="btn btn-outline"
                onClick={noShow}
                disabled={finished || working}
              >
                Mark no-show
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}