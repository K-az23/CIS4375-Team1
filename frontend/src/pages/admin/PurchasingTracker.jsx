import { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ChoiceGroup from '../../components/ChoiceGroup';
import { hairOptions, pricing, specFields } from '../../data/hairOptions';
import { isDemoMode } from '../../context/authUtils.js';
import { getPurchases, getPurchase, createPurchase, updatePurchase } from '../../services/purchasing';
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

  // The backend stores timestamps in UTC; show their dates in Central Time.
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
    purchaseId: purchase.purchase_id,
    supplier: purchase.supplier_name || '—',
    item: purchase.item_name || '—',
    quantity: purchase.quantity ?? '—',
    date: formatOrderedAt(purchase.ordered_at),
    status: purchaseStatuses[purchase.status] ?? 'Unknown',
  };
}


// Use the same date format as the backend when filling the date inputs.
function inputDate(value) {
  if (!value) return '';
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (name) => parts.find((item) => item.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function emptyPurchase() {
  return {
    supplier_name: '', item_name: '', quantity: '1', status: 'pending',
    ordered_at: '', received_at: '', notes: '',
  };
}

function PurchaseForm({ purchaseId, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyPurchase);
  const [version, setVersion] = useState(null);
  const [savedDates, setSavedDates] = useState({});
  const [loading, setLoading] = useState(purchaseId !== null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (purchaseId === null) return;
    const controller = new AbortController();
    // Cancel the read if this form closes before its request finishes.
    async function loadDetails() {
      setLoading(true);
      setLoadError('');
      try {
        const purchase = await getPurchase(purchaseId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!purchase || !Number.isInteger(purchase.version)) {
          throw new Error('The server returned invalid purchase details.');
        }
        setForm({
          supplier_name: purchase.supplier_name, item_name: purchase.item_name,
          quantity: String(purchase.quantity), status: purchase.status,
          ordered_at: inputDate(purchase.ordered_at), received_at: inputDate(purchase.received_at),
          notes: purchase.notes || '',
        });
        setSavedDates({ ordered_at: inputDate(purchase.ordered_at), received_at: inputDate(purchase.received_at) });
        setVersion(purchase.version);
        setSaveError('');
        setFieldErrors({});
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadDetails();
    return () => controller.abort();
  }, [purchaseId, reload]);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setSaveError('');
    setFieldErrors({});
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError('');
    setFieldErrors({});
    // Convert the quantity to a number. Keep the form filled if the save fails.
    const fields = { ...form, quantity: Number(form.quantity) };
    if (purchaseId !== null) {
      fields.version = version;
      // Keep the original saved time when its displayed date was not edited.
      for (const name of ['ordered_at', 'received_at']) {
        if (form[name] === savedDates[name]) delete fields[name];
      }
    }
    try {
      const purchase = purchaseId === null
        ? await createPurchase(fields)
        : await updatePurchase(purchaseId, fields);
      onSaved(purchase);
    } catch (error) {
      setSaveError(error.message);
      setFieldErrors(error.details || {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={purchaseId === null ? 'New supplier purchase' : `Purchase #${purchaseId}`}>
      {loading && <p role="status">Loading purchase details…</p>}
      {loadError && <p role="alert" className="notice notice--warning">{loadError}</p>}
      {loadError && <button type="button" className="btn btn-outline" onClick={() => setReload(reload + 1)}>Retry details</button>}
      {!loading && !loadError && <form className="form" onSubmit={save} style={{ marginTop: 12 }}>
        {saveError && <div role="alert" className="notice notice--warning">
          <p>{saveError}</p>
          {Object.entries(fieldErrors).map(([name, text]) => <p key={name}>{text}</p>)}
        </div>}
        <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="purchase-supplier">Supplier</label>
              <input id="purchase-supplier" name="supplier_name" required maxLength={120} value={form.supplier_name} onChange={change} />
            </div>
            <div className="field">
              <label htmlFor="purchase-item">Item</label>
              <input id="purchase-item" name="item_name" required maxLength={200} value={form.item_name} onChange={change} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="purchase-quantity">Quantity</label>
              <input id="purchase-quantity" name="quantity" type="number" min="1" max="1000000" step="1" required value={form.quantity} onChange={change} />
            </div>
            <div className="field">
              <label htmlFor="purchase-status">Status</label>
              <select id="purchase-status" name="status" value={form.status} onChange={change}>
                {Object.entries(purchaseStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="purchase-ordered">Ordered date (Central Time)</label>
              <input id="purchase-ordered" name="ordered_at" type="date" min="1900-01-01" max="9998-12-31" value={form.ordered_at} onChange={change} />
            </div>
            <div className="field">
              <label htmlFor="purchase-received">Received date (Central Time)</label>
              <input id="purchase-received" name="received_at" type="date" min="1900-01-01" max="9998-12-31" value={form.received_at} onChange={change} />
            </div>
          </div>
          <p className="field-hint">Missing dates are filled when marked Ordered or Received. Correct the dates here when recording an older purchase.</p>
          <div className="field">
            <label htmlFor="purchase-notes">Notes (optional)</label>
            <textarea id="purchase-notes" name="notes" maxLength={2000} rows={3} value={form.notes} onChange={change} />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-gold">{saving ? 'Saving…' : purchaseId === null ? 'Create purchase' : 'Save changes'}</button>
            <button type="button" className="btn btn-outline" onClick={onCancel}>Close form</button>
            {purchaseId !== null && <button type="button" className="btn btn-outline" onClick={() => {
              if (window.confirm('Reload saved details? This replaces your unsaved entries.')) setReload(reload + 1);
            }}>Reload saved details</button>}
          </div>
        </fieldset>
      </form>}
      {!saving && (loading || loadError) && <button type="button" className="btn btn-outline" onClick={onCancel}>Close form</button>}
    </Panel>
  );
}

function LivePurchasingTracker() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadPurchases() {
      setLoading(true);
      setError('');
      try {
        const purchases = await getPurchases({ signal: controller.signal });
        if (!Array.isArray(purchases)) throw new Error('The server returned an invalid purchasing list.');
        if (!controller.signal.aborted) setRows(purchases.map(toPurchaseRow));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPurchases();
    return () => controller.abort();
  }, [reload]);

  function saved(purchase) {
    const row = toPurchaseRow(purchase);
    setRows((previous) => [row, ...(previous || []).filter((item) => item.purchaseId !== purchase.purchase_id)]);
    setFilter('All');
    setEditor(null);
    setMessage(`Purchase #${purchase.purchase_id} saved.`);
  }

  const visible = rows?.filter((row) => filter === 'All' || row.status === filter);
  const columns = [...purchaseColumns, {
    key: 'actions', label: '', render: (row) => <button type="button" className="btn btn-outline btn-sm"
      disabled={editor !== null || loading} onClick={() => { setEditor({ id: row.purchaseId }); setMessage(''); }}>
      Details / edit
    </button>,
  }];

  return (
    <>
      <DashboardHeader eyebrow="Purchasing" title="Purchasing tracker" subtitle="Supplier orders and their current status." showIcons>
        <button type="button" className="btn btn-dark btn-sm" disabled={editor !== null || loading}
          onClick={() => { setEditor({ id: null }); setMessage(''); }}><Plus size={16} /> New purchase</button>
      </DashboardHeader>
      <div className="page-stack">
        <p className="field-hint">Record supplier purchases here. Receiving a purchase does not change inventory quantities; record received stock in Inventory.</p>
        {message && <p role="status" className="notice"><Check size={16} /> {message}</p>}
        {editor !== null && <PurchaseForm key={editor.id ?? 'new'} purchaseId={editor.id} onSaved={saved} onCancel={() => setEditor(null)} />}
        <div><button type="button" className="btn btn-outline btn-sm" disabled={loading || editor !== null} onClick={() => setReload(reload + 1)}>
          {loading ? 'Loading…' : 'Refresh purchases'}
        </button></div>
        {error && <p role="alert" className="notice notice--warning">Couldn’t load purchases. {error}</p>}
        {visible && <>
          <div className="tabs" style={{ justifySelf: 'start' }} role="group" aria-label="Filter purchases by status">
            {purchaseFilters.map((status) => <button type="button" key={status}
              className={`tabs__btn ${filter === status ? 'is-active' : ''}`} aria-pressed={filter === status}
              onClick={() => setFilter(status)}>{status}</button>)}
          </div>
          <Panel title={`${visible.length} purchases`}>
            <DataTable columns={columns} rows={visible} emptyMessage={rows.length === 0 ? 'No purchases yet.' : 'No purchases with this status.'} />
          </Panel>
        </>}
      </div>
    </>
  );
}

export default function PurchasingTracker() {
  return isDemoMode ? <DemoPurchasingTracker /> : <LivePurchasingTracker />;
}
