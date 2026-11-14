import { useEffect, useState } from 'react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import {
  getInventoryItem,
  getInventoryTransactions,
  updateInventoryItem,
  adjustInventoryItem,
  deactivateInventoryItem,
} from '../../services/inventory';

// Turn the backend's validation errors into one message for the form.
function getErrorMessage(error) {
  if (error.details) {
    return Object.values(error.details).join(' ');
  }
  return error.message;
}

// The backend saves stock dates in UTC. Show them in the salon's time zone.
function showDate(value) {
  if (!value) return '—';
  let dateText = value;
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(dateText)) {
    dateText = dateText + 'Z';
  }
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { timeZone: 'America/Chicago' });
}

function showEvent(value) {
  if (value === 'starting_stock') return 'Starting stock';
  if (value === 'restock') return 'Restock';
  if (value === 'manual_usage') return 'Marked used';
  if (value === 'manual_adjustment') return 'Stock correction';
  if (value === 'appointment_usage') return 'Appointment usage';
  return value;
}

export default function InventoryDetails({ itemId, categories, onUpdated, onClose, onBusyChange }) {
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [quantityChange, setQuantityChange] = useState('');
  const [loadingError, setLoadingError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load the selected item and its history. Cancel these requests if the
  // user closes the panel or selects a different item before they finish.
  useEffect(() => {
    const controller = new AbortController();

    async function loadItem() {
      try {
        const savedItem = await getInventoryItem(itemId, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setItem(savedItem);
          setForm(savedItem);
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadingError(error.message);
      }
    }

    async function loadHistory() {
      try {
        const history = await getInventoryTransactions(itemId, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setTransactions((current) => current ?? history);
        }
      } catch (error) {
        if (!controller.signal.aborted) setHistoryError(error.message);
      }
    }

    loadItem();
    loadHistory();
    return () => controller.abort();
  }, [itemId]);

  // Update only the input that the user changed.
  function changeForm(event) {
    const name = event.target.name;
    const value = event.target.value;
    setForm({ ...form, [name]: value });
  }

  // Read history again after a stock change, or when Refresh is clicked.
  async function refreshHistory() {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const history = await getInventoryTransactions(itemId);
      setTransactions(history);
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Save descriptions and prices here. Quantity changes have their own
  // form below so every stock correction gets a history entry.
  async function saveDetails(event) {
    event.preventDefault();
    setMessage('');
    setActionError('');

    const threshold = Number(form.reorder_threshold);
    if (form.reorder_threshold === '' || form.reorder_threshold == null ||
        !Number.isSafeInteger(threshold) || threshold < 0) {
      setActionError('Enter a whole number of zero or more for the reorder level.');
      return;
    }
    if (!form.item_name.trim() || !form.unit.trim()) {
      setActionError('Product name and unit cannot be blank.');
      return;
    }

    const fields = {
      item_name: form.item_name.trim(),
      brand: form.brand || null,
      measurement: form.measurement || null,
      sku: form.sku || null,
      unit: form.unit.trim(),
      item_type: form.item_type,
      price: form.price === '' || form.price == null ? null : Number(form.price),
      reorder_threshold: threshold,
    };

    // Keep an existing category unless the user chooses a different one.
    // This also lets an old item keep its category if that category was retired.
    if (Number(form.category_id) !== item.category_id) {
      fields.category_id = Number(form.category_id);
    }

    setSaving(true);
    onBusyChange(true);
    try {
      const savedItem = await updateInventoryItem(itemId, fields);
      setItem(savedItem);
      setForm(savedItem);
      onUpdated(savedItem);
      setMessage('Item details saved.');
    } catch (error) {
      // Keep the form filled in if saving fails.
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  // Send a signed change: 2 adds two units and -2 removes two units.
  // The backend checks the result and refuses negative stock.
  async function saveAdjustment(event) {
    event.preventDefault();
    setMessage('');
    setActionError('');
    const change = Number(quantityChange);
    if (!Number.isSafeInteger(change) || change === 0) {
      setActionError('Enter a nonzero whole number for the stock change.');
      return;
    }

    setSaving(true);
    onBusyChange(true);
    try {
      const savedItem = await adjustInventoryItem(itemId, change);
      setItem(savedItem);
      // Keep any description edits the user has not saved yet.
      setForm((current) => ({ ...current, quantity_on_hand: savedItem.quantity_on_hand }));
      onUpdated(savedItem);
      setQuantityChange('');
      setMessage('Stock correction saved.');
      await refreshHistory();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  // Deactivate the item instead of deleting it, so its history stays available.
  async function deactivate() {
    const confirmed = window.confirm(`Deactivate ${item.item_name}? Its history will be kept.`);
    if (!confirmed) return;

    setMessage('');
    setActionError('');
    setSaving(true);
    onBusyChange(true);
    try {
      const savedItem = await deactivateInventoryItem(itemId);
      setItem(savedItem);
      setForm(savedItem);
      onUpdated(savedItem);
      setMessage('Item deactivated. Its history is still available.');
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  const historyColumns = [
    { key: 'logged_at', label: 'Date', render: (row) => showDate(row.logged_at) },
    { key: 'event_type', label: 'Event', render: (row) => showEvent(row.event_type) },
    { key: 'quantity_change', label: 'Change', render: (row) => row.quantity_change > 0 ? '+' + row.quantity_change : row.quantity_change },
    { key: 'appointment_id', label: 'Appointment', render: (row) => row.appointment_id || '—' },
  ];

  return (
    <Panel title="Inventory item details">
      <div className="page-stack">
        <div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={saving || loadingHistory}>Close details</button>
        </div>
        {!item && !loadingError && <p role="status">Loading item…</p>}
        {loadingError && <p role="alert" className="notice notice--warning">Couldn’t load item. {loadingError}</p>}
        {message && <p role="status" className="notice">{message}</p>}
        {actionError && <p role="alert" className="notice notice--warning">{actionError}</p>}

        {item && form && (
          <>
            <p>On hand: <strong>{item.quantity_on_hand ?? '—'} {item.unit}</strong> · {item.is_active ? 'Active' : 'Inactive'}</p>

            {/* This form changes the item's details. Its stock count is shown above. */}
            <form className="form" onSubmit={saveDetails}>
              <fieldset disabled={saving || !item.is_active} style={{ border: 0, padding: 0 }}>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="edit-item-name">Product name</label>
                    <input id="edit-item-name" name="item_name" required maxLength={100} value={form.item_name} onChange={changeForm} />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-brand">Brand</label>
                    <input id="edit-brand" name="brand" maxLength={100} value={form.brand ?? ''} onChange={changeForm} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="edit-size">Size</label>
                    <input id="edit-size" name="measurement" maxLength={50} value={form.measurement ?? ''} onChange={changeForm} />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-sku">SKU (optional)</label>
                    <input id="edit-sku" name="sku" maxLength={50} value={form.sku ?? ''} onChange={changeForm} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="edit-unit">Unit</label>
                    <input id="edit-unit" name="unit" required maxLength={50} value={form.unit} onChange={changeForm} />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-price">Price ($)</label>
                    <input id="edit-price" name="price" type="number" min="0" max="99999999.99" step="0.01" value={form.price ?? ''} onChange={changeForm} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="edit-reorder">Reorder at</label>
                    <input id="edit-reorder" name="reorder_threshold" type="number" required min="0" max="2147483647" step="1" value={form.reorder_threshold ?? ''} onChange={changeForm} />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-category">Category</label>
                    <select id="edit-category" name="category_id" required value={form.category_id} onChange={changeForm} disabled={!categories}>
                      {categories?.map((category) => (
                        <option key={category.category_id} value={category.category_id} disabled={!category.is_active}>
                          {category.category_name}{category.is_active ? '' : ' (inactive)'}
                        </option>
                      ))}
                    </select>
                    {!categories && <p className="field-hint">Categories are unavailable. Close this panel and refresh the page to try again.</p>}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="edit-type">How it’s used</label>
                  <select id="edit-type" name="item_type" value={form.item_type ?? ''} onChange={changeForm}>
                    <option value="" disabled>Select how it’s used</option>
                    <option value="per-use">Per use – logged at checkout</option>
                    <option value="bulk">Bulk – mark used when empty</option>
                  </select>
                </div>
                <button className="btn btn-gold">{saving ? 'Saving…' : 'Save details'}</button>
              </fieldset>
            </form>

            {/* Stock corrections are kept separate so they appear in history. */}
            {item.is_active && (
              <>
                <form className="form" onSubmit={saveAdjustment}>
                  <h4>Correct stock quantity</h4>
                  <p className="field-hint">Use 2 to add two units, or -2 to remove two units.</p>
                  <div className="field">
                    <label htmlFor="stock-change">Quantity change</label>
                    <input id="stock-change" type="number" step="1" min="-2147483647" max="2147483647" required disabled={saving} value={quantityChange} onChange={(event) => setQuantityChange(event.target.value)} />
                  </div>
                  <button className="btn btn-outline" disabled={saving}>Save stock correction</button>
                </form>
                <div>
                  <button type="button" className="btn btn-outline" disabled={saving} onClick={deactivate}>Deactivate item</button>
                </div>
              </>
            )}
          </>
        )}

        {/* Both manual stock changes and appointment usage appear in this table. */}
        <h4>Stock history</h4>
        <p className="field-hint">Times are shown in Central Time. Appointment usage may have no recorded date.</p>
        <div>
          <button type="button" className="btn btn-outline btn-sm" disabled={saving || loadingHistory} onClick={refreshHistory}>Refresh history</button>
        </div>
        {(!transactions || loadingHistory) && !historyError && <p role="status">Loading history…</p>}
        {historyError && <p role="alert" className="notice notice--warning">Couldn’t load history. {historyError}</p>}
        {!historyError && !loadingHistory && transactions && (
          <DataTable columns={historyColumns} rows={transactions} emptyMessage="No stock transactions yet." />
        )}
      </div>
    </Panel>
  );
}
