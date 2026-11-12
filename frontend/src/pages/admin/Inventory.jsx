import { useEffect, useState } from 'react';
import { Plus, Check, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ServiceTabs from '../../components/ServiceTabs';
import { api } from '../../api/client';
import { money } from '../../data/sampleData';

const emptyItem = { item_type: 'per-use', category_id: '', item_name: '', brand: '', measurement: '', quantity_on_hand: '', reorder_threshold: '', price: '' };

const isColor = (item, categories) => categories[item.category_id]?.toLowerCase() === 'color';

const tabs = [
  { value: 'per-use', label: 'Hair replacement supplies', hint: 'Logged per appointment on the Checkout page and deducted automatically.', match: (i, c) => i.item_type !== 'bulk' && !isColor(i, c) },
  { value: 'bulk', label: 'Hair care & styling', hint: 'Not tied to appointments. Mark one used when a bottle runs out.', match: (i, c) => i.item_type === 'bulk' && !isColor(i, c) },
  { value: 'color', label: 'Color', hint: 'One row per shade. Mark one used when a tube runs out.', match: (i, c) => isColor(i, c) },
];

function displayName(item) {
  return [item.brand, item.item_name].filter(Boolean).join(' ') + (item.measurement ? ` – ${item.measurement}` : '');
}

export default function Inventory() {
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState({});
  const [tab, setTab] = useState('per-use');
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyItem);
  const [restocking, setRestocking] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function loadItems() {
    return api('/api/admin/inventory-items')
      .then((data) => setItems(data.items.filter((i) => i.is_active)))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadItems();
    api('/api/admin/item-categories')
      .then((data) => setCategories(Object.fromEntries(
        (data.categories ?? data.item_categories ?? []).filter((c) => c.is_active).map((c) => [c.category_id, c.category_name]),
      )))
      .catch(() => {});
  }, []);

  // Applies the backend's response to the one row that changed.
  function replaceItem(updated, note) {
    setItems((current) => current.map((i) => (i.item_id === updated.item_id ? updated : i)));
    setMessage(note);
  }

  async function markUsed(item) {
    setError('');
    try {
      const data = await api(`/api/admin/inventory-items/${item.item_id}/use`, { method: 'POST' });
      replaceItem(data.item, `Marked one ${displayName(item)} as used.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function restock(item) {
    setError('');
    const quantity = Number(restockQty);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Enter a whole number of 1 or more to re-stock.');
      return;
    }
    try {
      const data = await api(`/api/admin/inventory-items/${item.item_id}/restock`, { method: 'POST', body: { quantity } });
      replaceItem(data.item, `Re-stocked ${quantity} × ${displayName(item)}.`);
      setRestocking(null);
      setRestockQty('');
    } catch (err) {
      setError(err.message);
    }
  }

  function update(e) {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  }

  async function addItem(e) {
    e.preventDefault();
    setError('');
    const body = {
      category_id: Number(newItem.category_id),
      item_name: newItem.item_name,
      brand: newItem.brand,
      measurement: newItem.measurement,
      item_type: newItem.item_type,
      quantity_on_hand: Number(newItem.quantity_on_hand),
      reorder_threshold: Number(newItem.reorder_threshold),
      // The backend requires a unit; the form counts items one at a time.
      unit: 'each',
    };
    if (newItem.price !== '') body.price = Number(newItem.price);
    try {
      const data = await api('/api/admin/inventory-items', { method: 'POST', body });
      setItems((current) => [...current, data.item]);
      setTab(isColor(data.item, categories) ? 'color' : data.item.item_type === 'bulk' ? 'bulk' : 'per-use');
      setMessage(`${displayName(data.item)} added.`);
      setNewItem(emptyItem);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Item', render: displayName },
    { key: 'category', label: 'Category', render: (r) => categories[r.category_id] ?? '—' },
    { key: 'quantity_on_hand', label: 'On hand', align: 'right' },
    { key: 'reorder_threshold', label: 'Reorder at', align: 'right' },
    { key: 'price', label: 'Cost', align: 'right', render: (r) => money(r.price) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.quantity_on_hand === 0 ? 'Out' : r.quantity_on_hand <= r.reorder_threshold ? 'Low' : 'In stock'} /> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
          {r.item_type === 'bulk' && restocking !== r.item_id && (
            <button className="btn btn-outline btn-sm" onClick={() => markUsed(r)} disabled={r.quantity_on_hand === 0}>
              Mark one used
            </button>
          )}
          {restocking === r.item_id ? (
            <>
              <input type="number" min="1" style={{ width: 72 }} aria-label="Quantity received" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
              <button className="btn btn-dark btn-sm" onClick={() => restock(r)}>Add</button>
              <button className="btn btn-outline btn-sm" onClick={() => setRestocking(null)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => { setRestocking(r.item_id); setRestockQty(''); }}>Re-stock</button>
          )}
        </div>
      ),
    },
  ];

  const currentTab = tabs.find((t) => t.value === tab);
  const visible = (items ?? []).filter((i) => currentTab.match(i, categories));

  return (
    <>
      <DashboardHeader eyebrow="Stock" title="Inventory" subtitle="Items at or below their reorder level show as Low." showIcons>
        <button className="btn btn-dark btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? 'Close form' : 'New item'}
        </button>
      </DashboardHeader>

      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

        {showForm && (
          <Panel title="New inventory item">
            <form className="form" onSubmit={addItem} style={{ marginTop: 12 }}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="type">How it's used</label>
                  <select id="type" name="item_type" value={newItem.item_type} onChange={update}>
                    <option value="per-use">Per use – logged at checkout</option>
                    <option value="bulk">Bulk – mark used when empty</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <select id="category" name="category_id" required value={newItem.category_id} onChange={update}>
                    <option value="" disabled>Select a category</option>
                    {Object.entries(categories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="name">Product name</label>
                  <input id="name" name="item_name" required value={newItem.item_name} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="brand">Brand</label>
                  <input id="brand" name="brand" required value={newItem.brand} onChange={update} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="size">Size</label>
                  <input id="size" name="measurement" placeholder="e.g. 100ml or 6A (optional)" value={newItem.measurement} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="cost">Cost ($)</label>
                  <input id="cost" name="price" type="number" min="0" step="0.01" value={newItem.price} onChange={update} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="qty">Starting quantity</label>
                  <input id="qty" name="quantity_on_hand" type="number" min="0" required value={newItem.quantity_on_hand} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="threshold">Reorder at</label>
                  <input id="threshold" name="reorder_threshold" type="number" min="0" required value={newItem.reorder_threshold} onChange={update} />
                </div>
              </div>
              <div><button type="submit" className="btn btn-gold">Add item</button></div>
            </form>
          </Panel>
        )}

        <div>
          <ServiceTabs options={tabs} value={tab} onChange={setTab} />
          <p className="field-hint" style={{ marginTop: 8 }}>{currentTab.hint}</p>
        </div>

        <Panel title={`${visible.length} items`}>
          <DataTable
            columns={columns}
            rows={visible.map((i) => ({ ...i, id: i.item_id }))}
            emptyMessage={items === null && !error ? 'Loading…' : 'No items in this group yet.'}
          />
        </Panel>
      </div>
    </>
  );
}
