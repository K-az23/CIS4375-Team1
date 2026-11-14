import { useEffect, useState } from 'react';
import ItemCategories from './ItemCategories';
import InventoryDetails from './InventoryDetails';
import InventoryLowStock from './InventoryLowStock';
import { Plus, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ServiceTabs from '../../components/ServiceTabs';
import { inventoryItems, money } from '../../data/sampleData';
import { isDemoMode } from '../../context/authUtils.js';
import { getItemCategories } from '../../services/itemCategories';
import {
  createInventoryItem,
  getInventory,
  restockInventoryItem,
  markInventoryItemUsed,
} from '../../services/inventory';

const demoCategories = ['Adhesive', 'Supplies', 'Hair care', 'Styling', 'Color', 'Other']
  .map((name) => ({ category_id: name, category_name: name, is_active: true }));
const emptyItem = { type: 'per-use', category: '', unit: 'each', name: '', brand: '', size: '', qty: '', threshold: '', cost: '' };

const tabs = [
  ...(isDemoMode ? [] : [{ value: 'all', label: 'All items', hint: 'Stock from the inventory API.', match: () => true }]),
  { value: 'per-use', label: 'Hair replacement supplies', hint: 'Logged per appointment on the Checkout page and deducted automatically.', match: (i) => i.type === 'per-use' },
  { value: 'bulk', label: 'Hair care & styling', hint: 'Not tied to appointments. Mark one used when a bottle runs out.', match: (i) => i.type === 'bulk' && i.category !== 'Color' },
  { value: 'color', label: 'Color', hint: 'One row per shade. Mark one used when a tube runs out.', match: (i) => i.category === 'Color' },
];

function toRow(item, categoryNames) {
  const name = [item.brand, item.item_name].filter(Boolean).join(' ');

  return {
    id: item.item_id,
    name: item.measurement ? `${name} – ${item.measurement}` : name,
    category: categoryNames.get(item.category_id) ?? 'Unknown category',
    type: item.item_type,
    qty: item.quantity_on_hand,
    threshold: item.reorder_threshold,
    cost: item.price,
    isActive: item.is_active,
  };
}

function stockStatus(row) {
  if (row.isActive === false) return 'Inactive';
  if (row.qty == null) return 'Unknown';
  if (row.qty === 0) return 'Out';
  if (row.threshold != null && row.qty <= row.threshold) return 'Low';
  return 'In stock';
}

export default function Inventory() {
  const [items, setItems] = useState(isDemoMode ? inventoryItems : null);
  const [tab, setTab] = useState(isDemoMode ? 'per-use' : 'all');
  // Keep track of the open detail panel and the low-stock list.
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyItem);
  const [message, setMessage] = useState('');

  const [categories, setCategories] = useState(isDemoMode ? demoCategories : null);
  const [categoryError, setCategoryError] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    getItemCategories({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setCategories(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCategoryError(error.message);
      });

    getInventory({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setItems(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setInventoryError(error.message);
      });

    return () => controller.abort();
  }, []);

  async function updateQty(row, change) {
    setMessage('');
    setActionError('');
    setSaving(true);

    try {
      if (isDemoMode) {
        setItems((current) => current.map((item) =>
          item.id === row.id ? { ...item, qty: Math.max(0, item.qty + change) } : item,
        ));
      } else {
        const updated = change < 0
          ? await markInventoryItemUsed(row.id)
          : await restockInventoryItem(row.id, change);

        setItems((current) => current.map((item) =>
          item.item_id === updated.item_id ? updated : item,
        ));
      }

      setMessage(change < 0 ? `Marked one ${row.name} as used.` : `Re-stocked ${change} × ${row.name}.`);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function restock(row) {
    if (isDemoMode) {
      updateQty(row, row.lastOrderQty);
      return;
    }

    const input = window.prompt(`How many units of ${row.name} did you receive?`, '1');
    if (input === null) return;

    const quantity = Number(input);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setMessage('');
      setActionError('Enter a positive whole number to restock.');
      return;
    }

    updateQty(row, quantity);
  }

  function update(event) {
    const { name, value } = event.target;
    setNewItem((current) => ({ ...current, [name]: value }));
  }

  async function addItem(event) {
    event.preventDefault();
    setMessage('');
    setActionError('');
    setSaving(true);

    try {
      if (isDemoMode) {
        setItems((current) => [...current, {
          id: Date.now(),
          name: `${newItem.brand} ${newItem.name}${newItem.size ? ` – ${newItem.size}` : ''}`,
          brand: newItem.brand,
          category: newItem.category,
          type: newItem.type,
          qty: Number(newItem.qty),
          threshold: Number(newItem.threshold),
          lastOrderQty: Number(newItem.qty) || 10,
          cost: newItem.cost === '' ? null : Number(newItem.cost),
        }]);
        setTab(newItem.category === 'Color' ? 'color' : newItem.type);
      } else {
        const item = await createInventoryItem({
          category_id: Number(newItem.category),
          item_name: newItem.name,
          brand: newItem.brand,
          measurement: newItem.size,
          item_type: newItem.type,
          quantity_on_hand: Number(newItem.qty),
          reorder_threshold: Number(newItem.threshold),
          unit: newItem.unit,
          ...(newItem.cost === '' ? {} : { price: Number(newItem.cost) }),
        });
        setItems((current) => [...(current ?? []), item]);
        setTab('all');
      }

      setMessage(`${newItem.name} added.`);
      setNewItem(emptyItem);
      setShowForm(false);
    } catch (error) {
      setActionError(Object.values(error.details ?? {}).join(' ') || error.message);
    } finally {
      setSaving(false);
    }
  }

  // Replace the saved row with the latest item returned by Flask.
  // This also causes the low-stock list to refresh.
  function receiveUpdatedItem(updated) {
    setItems((current) => current.map((item) => item.item_id === updated.item_id ? updated : item));
  }

  // Keep category labels and the New item dropdown in sync after a change.
  // Clear a selected category if it was deactivated while the form was open.
  function receiveCategories(savedCategories) {
    setCategories(savedCategories);
    setCategoryError('');
    setNewItem((current) => {
      const selectedCategory = savedCategories.find((category) => String(category.category_id) === current.category);
      if (current.category && (!selectedCategory || !selectedCategory.is_active)) {
        return { ...current, category: '' };
      }
      return current;
    });
  }

  const columns = [
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'qty', label: 'On hand', align: 'right', render: (r) => r.qty ?? '—' },
    { key: 'threshold', label: 'Reorder at', align: 'right', render: (r) => r.threshold ?? '—' },
    { key: 'cost', label: isDemoMode ? 'Cost' : 'Price', align: 'right', render: (r) => money(r.cost) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={stockStatus(r)} /> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!isDemoMode && (
            <button className="btn btn-outline btn-sm" disabled={saving || selectedItemId === r.id} onClick={() => {
              setSelectedItemId(r.id);
              setShowForm(false);
              setShowCategories(false);
            }}>Details / edit</button>
          )}
          {r.type === 'bulk' && (
            <button className="btn btn-outline btn-sm" onClick={() => updateQty(r, -1)} disabled={saving || selectedItemId != null || !r.qty || r.isActive === false}>
              Mark one used
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => restock(r)} disabled={saving || selectedItemId != null || r.isActive === false}>
            {isDemoMode ? `Re-stock +${r.lastOrderQty}` : 'Re-stock'}
          </button>
        </div>
      ),
    },
  ];

  const currentTab = tabs.find((t) => t.value === tab);
  const categoryNames = new Map(categories?.map((category) => [category.category_id, category.category_name]));
  const activeCategories = categories?.filter((category) => category.is_active);
  const rows = isDemoMode ? items : items?.map((item) => toRow(item, categoryNames));
  const visible = rows?.filter(currentTab.match);

  return (
    <>
      <DashboardHeader eyebrow="Stock" title="Inventory" subtitle="View stock levels and record inventory changes." showIcons>
        <button className="btn btn-dark btn-sm" onClick={() => { setSelectedItemId(null); setShowCategories(false); setShowForm(!showForm); }} disabled={saving || !items}>
          <Plus size={16} /> {showForm ? 'Close form' : 'New item'}
        </button>
      </DashboardHeader>

      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}

        {actionError && <p role="alert" className="notice notice--warning">{actionError}</p>}

        {/* These controls use the live backend. The demo page stays as it was. */}
        {!isDemoMode && (
          <div><button className="btn btn-outline" onClick={() => setShowLowStock(!showLowStock)}>
            {showLowStock ? 'Hide low stock' : 'Show low stock'}
          </button></div>
        )}
        {/* Category management uses the existing category API. */}
        {!isDemoMode && (
          <div>
            <button type="button" className="btn btn-outline" disabled={saving} onClick={() => {
              setSelectedItemId(null);
              setShowForm(false);
              setShowCategories(!showCategories);
            }}>
              {showCategories ? 'Close categories' : 'Manage categories'}
            </button>
          </div>
        )}
        {!isDemoMode && showCategories && (
          <ItemCategories categories={categories} error={categoryError}
            onUpdated={receiveCategories} onBusyChange={setSaving} />
        )}
        {!isDemoMode && showLowStock && <InventoryLowStock inventory={items} />}
        {!isDemoMode && selectedItemId != null && (
          <InventoryDetails key={selectedItemId} itemId={selectedItemId} categories={categories}
            onUpdated={receiveUpdatedItem} onBusyChange={setSaving} onClose={() => setSelectedItemId(null)} />
        )}
        {showForm && (
          <Panel title="New inventory item">
            <form className="form" onSubmit={addItem} style={{ marginTop: 12 }}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="type">How it's used</label>
                  <select id="type" name="type" value={newItem.type} onChange={update} disabled={saving}>
                    <option value="per-use">Per use – logged at checkout</option>
                    <option value="bulk">Bulk – mark used when empty</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={newItem.category}
                    onChange={update} disabled={saving || !activeCategories?.length}
                  >
                    <option value="" disabled>Select a category</option>
                    {activeCategories?.map((category) => (
                      <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
                    ))}
                  </select>
                  {!categories && !categoryError && (
                    <p role="status" className="field-hint">Loading categories…</p>
                  )}
                  {categoryError && (
                    <p role="alert" className="field-hint">Couldn’t load categories. {categoryError}</p>
                  )}
                  {activeCategories?.length === 0 && (
                    <p className="field-hint">No active categories are available.</p>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="name">Product name</label>
                  <input id="name" name="name" required value={newItem.name} onChange={update} disabled={saving} />
                </div>
                <div className="field">
                  <label htmlFor="brand">Brand</label>
                  <input id="brand" name="brand" required value={newItem.brand} onChange={update} disabled={saving} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="size">Size</label>
                  <input id="size" name="size" placeholder="e.g. 100ml or 6A (optional)" value={newItem.size} onChange={update} disabled={saving} />
                </div>
                <div className="field">
                  <label htmlFor="cost">{isDemoMode ? 'Cost ($)' : 'Price ($)'}</label>
                  <input id="cost" name="cost" type="number" min="0" step="0.01" value={newItem.cost} onChange={update} disabled={saving} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="qty">Starting quantity</label>
                  <input id="qty" name="qty" type="number" min="0" required value={newItem.qty} onChange={update} disabled={saving} />
                </div>
                <div className="field">
                  <label htmlFor="threshold">Reorder at</label>
                  <input id="threshold" name="threshold" type="number" min="0" required value={newItem.threshold} onChange={update} disabled={saving} />
                </div>
              </div>
              {!isDemoMode && (
                <div className="field">
                  <label htmlFor="unit">Unit</label>
                  <input id="unit" name="unit" required maxLength={50} value={newItem.unit} onChange={update} disabled={saving} />
                </div>
              )}
              <div>
                <button type="submit" className="btn btn-gold" disabled={saving || !newItem.category}>
                  {saving ? 'Saving…' : 'Add item'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <div>
          <ServiceTabs options={tabs} value={tab} onChange={setTab} />
          <p className="field-hint" style={{ marginTop: 8 }}>{currentTab.hint}</p>
        </div>

        {!items && !inventoryError && <p role="status">Loading inventory…</p>}
        {inventoryError && <p role="alert" className="notice notice--warning">Couldn’t load inventory. {inventoryError}</p>}
        {visible && (
          <Panel title={`${visible.length} items`}>
            <DataTable columns={columns} rows={visible} emptyMessage="No items in this view." />
          </Panel>
        )}
      </div>
    </>
  );
}
