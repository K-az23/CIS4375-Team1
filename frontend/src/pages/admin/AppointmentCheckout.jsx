import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, Trash2, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import {
  appointmentStatusLabel,
  customerName,
} from '../../api/format';
import {
  appointmentTime,
  salonDate,
} from '../../services/appointments';
import AdminPayments from './AdminPayments';
import {
  allServices,
  serviceCategories,
  priceToNumber,
} from '../../data/services';
import { money } from '../../data/sampleData';

// Flask sends UTC timestamps. Show the time at the salon.
function formatAppointment(value) {
  const time = appointmentTime(value);

  if (!Number.isFinite(time)) return 'Time unavailable';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(time);
}

function findService(name, fallbackPrice) {
  return allServices.find((service) => service.name === name)
    ?? {
      name,
      price: fallbackPrice != null ? `$${fallbackPrice}` : '$0',
    };
}

function startState(appointment) {
  const name = appointment?.service?.service_name;

  return {
    services: name
      ? [findService(name, appointment.service.price)]
      : [],
    products: [],
  };
}

function VisitCheckout({ onWorkingChange }) {
  const [appointments, setAppointments] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(startState(null));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const actionLock = useRef(false);

  // Load today's visits and the active products used during appointments.
  useEffect(() => {
    const today = salonDate();

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
      .then((data) => {
        setInventory(
          data.items.filter(
            (item) => item.is_active && item.item_type !== 'bulk'
          )
        );
      })
      .catch(() => {});
  }, []);

  const appt = (appointments ?? []).find(
    (appointment) => appointment.setmore_booking_id === selectedId
  );

  const total = form.services.reduce(
    (sum, service) => sum + priceToNumber(service.price),
    0
  );

  const finished = appt && appt.status !== 'booked';

  function select(appointment) {
    setSelectedId(appointment.setmore_booking_id);
    setForm(startState(appointment));
    setMessage('');
    setError('');
  }

  function addService(name) {
    if (!name) return;

    setForm({
      ...form,
      services: [...form.services, findService(name)],
    });
  }

  function removeService(index) {
    setForm({
      ...form,
      services: form.services.filter((_, i) => i !== index),
    });
  }

  function changeQty(itemId, change) {
    const products = form.products
      .map((product) =>
        product.itemId === itemId
          ? { ...product, qty: product.qty + change }
          : product
      )
      .filter((product) => product.qty > 0);

    setForm({ ...form, products });
  }

  function addProduct(id) {
    const itemId = Number(id);

    if (
      !itemId ||
      form.products.some((product) => product.itemId === itemId)
    ) {
      return;
    }

    setForm({
      ...form,
      products: [...form.products, { itemId, qty: 1 }],
    });
  }

  // Replace the visit with the saved copy returned by Flask.
  function applyUpdate(updated) {
    setAppointments((list) =>
      list.map((appointment) =>
        appointment.setmore_booking_id === updated.setmore_booking_id
          ? updated
          : appointment
      )
    );
  }

  async function complete() {
    if (actionLock.current || !appt || finished) return;

    actionLock.current = true;
    setWorking(true);
    onWorkingChange(true);
    setError('');
    setMessage('');

    try {
      // Send the visit and all products in one request.
      // Flask saves everything together or rolls everything back.
      const products = form.products.map((product) => ({
        item_id: product.itemId,
        quantity: product.qty,
      }));

      const data = await api(
        `/api/admin/appointments/${encodeURIComponent(appt.setmore_booking_id)}/complete`,
        {
          method: 'POST',
          body: { products },
        }
      );

      applyUpdate(data.appointment);

      const deducted = products.reduce(
        (sum, product) => sum + product.quantity,
        0
      );

      setMessage(
        `Visit completed. Collect ${money(total)} in person. ` +
        `${deducted} product unit(s) deducted from inventory.`
      );
    } catch (err) {
      setError(
        `${err.message} If the connection was interrupted, ` +
        'refresh Calendar and Inventory before trying again.'
      );
    } finally {
      actionLock.current = false;
      setWorking(false);
      onWorkingChange(false);
    }
  }

  async function noShow() {
    if (actionLock.current || !appt || finished) return;

    actionLock.current = true;
    setWorking(true);
    onWorkingChange(true);
    setError('');
    setMessage('');

    try {
      const data = await api(
        `/api/admin/appointments/${encodeURIComponent(appt.setmore_booking_id)}/no-show`,
        { method: 'POST' }
      );

      applyUpdate(data.appointment);

      setMessage(
        `${customerName(appt.customer)} marked as a no-show. No fee is charged.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      actionLock.current = false;
      setWorking(false);
      onWorkingChange(false);
    }
  }

  if (appointments === null || !appt) {
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
                : 'No appointments today. Bookings appear here after a sync on the Calendar page.'}
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
            {appointments.map((appointment) => (
              <button
                key={appointment.setmore_booking_id}
                className={`appt-item ${
                  appointment.setmore_booking_id === selectedId
                    ? 'is-selected'
                    : ''
                }`}
                onClick={() => select(appointment)}
                disabled={working}
              >
                <span className="appt-item__top">
                  <span>
                    {formatAppointment(appointment.appointment_time)}
                  </span>
                  <StatusBadge
                    status={appointmentStatusLabel(appointment.status)}
                  />
                </span>

                <span className="appt-item__name">
                  {customerName(appointment.customer)}
                </span>

                <span className="small muted">
                  {appointment.service?.service_name ?? '—'}
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
            title={`${customerName(appt.customer)} · ${formatAppointment(appt.appointment_time)}`}
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
                    type="button"
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
              <span className="muted">Total to collect</span>
              <strong>{money(total)}</strong>
            </div>
          </Panel>

          <Panel title="Products used">
            <p
              className="field-hint"
              style={{ margin: '4px 0 8px' }}
            >
              Add what was used. Stock is deducted when the visit
              is completed.
            </p>

            <div className="line-items">
              {form.products.map((product) => {
                const item = inventory.find(
                  (entry) => entry.item_id === product.itemId
                );

                return (
                  <div key={product.itemId} className="line-item">
                    <span>
                      {item
                        ? [item.brand, item.item_name]
                            .filter(Boolean)
                            .join(' ')
                        : `Item #${product.itemId}`}
                    </span>

                    <span className="qty">
                      <button
                        type="button"
                        aria-label="Less"
                        onClick={() =>
                          changeQty(product.itemId, -1)
                        }
                        disabled={finished || working}
                      >
                        <Minus size={14} />
                      </button>

                      <span>{product.qty}</span>

                      <button
                        type="button"
                        aria-label="More"
                        onClick={() =>
                          changeQty(product.itemId, 1)
                        }
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
                    {[item.brand, item.item_name]
                      .filter(Boolean)
                      .join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </Panel>

          <Panel title="Finish visit">
            <p className="field-hint" style={{ marginTop: 8 }}>
              Payment for services is taken in person.
            </p>

            <div className="row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-dark"
                onClick={complete}
                disabled={finished || working}
              >
                {working ? 'Working…' : 'Complete visit'}
              </button>

              <button
                type="button"
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

// Keep both screens available, but prevent switching during a visit save.
export default function AppointmentCheckout() {
  const [showPayments, setShowPayments] = useState(false);
  const [visitWorking, setVisitWorking] = useState(false);

  return (
    <>
      <div className="row" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={
            showPayments ? 'btn btn-outline' : 'btn btn-dark'
          }
          disabled={visitWorking}
          onClick={() => setShowPayments(false)}
        >
          Visit checkout
        </button>

        <button
          type="button"
          className={
            showPayments ? 'btn btn-dark' : 'btn btn-outline'
          }
          disabled={visitWorking}
          onClick={() => setShowPayments(true)}
        >
          Payments & refunds
        </button>
      </div>

      {showPayments
        ? <AdminPayments />
        : <VisitCheckout onWorkingChange={setVisitWorking} />}
    </>
  );
}