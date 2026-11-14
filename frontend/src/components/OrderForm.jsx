import { useEffect, useRef, useState } from 'react';
import { getOrderCatalog, createOrder, createInvoice, orderError } from '../services/orders';
import { getAdminCustomers } from '../services/users';
import { money } from '../data/sampleData';

const fields = [
  ['hair_type', 'Hair type'], ['base_type', 'Base type'],
  ['skin_thickness', 'Skin thickness'], ['color', 'Color'],
  ['grey_percent', 'Grey percentage'], ['density', 'Density'], ['dimensions', 'Dimensions'],
];
const emptySpecs = Object.fromEntries(fields.map(([key]) => [key, '']));

export default function OrderForm({ admin = false, onSaved, onClose }) {
  const [catalog, setCatalog] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [specs, setSpecs] = useState(emptySpecs);
  const [systemType, setSystemType] = useState(admin ? 'full' : 'area');
  const [customerId, setCustomerId] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const saveLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      try {
        const data = await getOrderCatalog({ signal: controller.signal });
        const users = admin ? await getAdminCustomers({ signal: controller.signal }) : [];
        if (!controller.signal.aborted) {
          setCatalog(data);
          setCustomers(users.filter((user) => user.is_active));
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(orderError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadOptions();
    return () => controller.abort();
  }, [admin, retry]);

  const system = catalog?.system_types.find((type) => type.key === systemType);
  const minimumPrice = system?.price;
  const complete = fields.every(([key]) => specs[key] !== '') && (!admin || customerId !== '');

  async function submit(event) {
    event.preventDefault();
    if (saveLock.current || !complete) return;
    // Lock immediately so repeated clicks cannot submit this form twice.
    saveLock.current = true;
    setSaving(true);
    setError('');
    try {
      const selectedSpecs = { ...specs, grey_percent: Number(specs.grey_percent) };
      let order;
      if (admin) {
        const body = { user_id: Number(customerId), system_type: systemType, specs: selectedSpecs };
        if (systemType === 'full') body.price = price;
        order = await createInvoice(body);
      } else {
        order = await createOrder(selectedSpecs);
      }
      onSaved(order);
    } catch (error) {
      setError(orderError(error));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  function changeType(value) {
    setSystemType(value);
    setSpecs({ ...specs, dimensions: '' });
  }

  return (
    <form className="form" onSubmit={submit}>
      {loading && <p role="status">Loading hair options…</p>}
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      {!catalog && !loading && <button type="button" className="btn btn-outline" onClick={() => {
        setError(''); setLoading(true); setRetry((old) => old + 1);
      }}>Retry loading options</button>}
      <fieldset disabled={saving || loading || !catalog} style={{ border: 0, padding: 0, margin: 0 }}>
        {admin && <div className="form-row">
          <div className="field">
            <label htmlFor="order-customer">Customer</label>
            <select id="order-customer" required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Select an active customer</option>
              {customers.map((user) => <option key={user.user_id} value={user.user_id}>
                {user.first_name} {user.last_name} — {user.email}
              </option>)}
            </select>
            {!loading && customers.length === 0 && <p className="field-hint">No active customers available.</p>}
          </div>
          <div className="field">
            <label htmlFor="order-system">System type</label>
            <select id="order-system" value={systemType} onChange={(event) => changeType(event.target.value)}>
              {catalog?.system_types.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </div>
        </div>}
        {fields.map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={`order-${key}`}>{label}</label>
            {admin && systemType === 'full' && key === 'dimensions' ? (
              <input id={`order-${key}`} required maxLength={100} value={specs[key]}
                placeholder="Measurements from the consultation"
                onChange={(event) => setSpecs({ ...specs, [key]: event.target.value })} />
            ) : (
              <select id={`order-${key}`} required value={specs[key]}
                onChange={(event) => setSpecs({ ...specs, [key]: event.target.value })}>
                <option value="">Select {label.toLowerCase()}</option>
                {catalog?.options[key].map((value) => <option key={value} value={value}>
                  {key === 'grey_percent' ? `${value}%` : value}
                </option>)}
              </select>
            )}
          </div>
        ))}
        {admin && systemType === 'full' ? (
          <div className="field">
            <label htmlFor="order-price">Invoice amount ($)</label>
            <input id="order-price" type="number" min={minimumPrice} max="99999.99" step="0.01" required
              value={price} onChange={(event) => setPrice(event.target.value)} />
            <p className="field-hint">At least {money(minimumPrice)}, based on the consultation.</p>
          </div>
        ) : <p>System price: <strong>{money(minimumPrice)}</strong></p>}
        <p className="field-hint">Creating this order saves an invoice awaiting payment. It does not charge a card or send an email.</p>
        <button type="submit" className="btn btn-gold" disabled={!complete || saving}>
          {saving ? 'Saving…' : admin ? 'Create invoice' : 'Create order'}
        </button>
      </fieldset>
      <button type="button" className="btn btn-outline" disabled={saving} onClick={onClose} style={{ marginTop: 12 }}>Cancel</button>
    </form>
  );
}
