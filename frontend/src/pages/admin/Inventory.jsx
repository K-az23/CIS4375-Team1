import { useState } from 'react';
import { Plus, Minus, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ServiceTabs from '../../components/ServiceTabs';
import { inventoryItems, money } from '../../data/sampleData';

const categories = ['Adhesive', 'Supplies', 'Hair care', 'Styling', 'Color', 'Other'];
const emptyItem = { type: 'per-use', category: '', name: '', brand: '', size: '', qty: '', threshold: '', cost: '' };

const tabs = [
  { value: 'per-use', label: 'Hair replacement supplies', hint: 'Glue, tape and gloves. Products in use show up on the Checkout page.', match: (i) => i.type === 'per-use' },
  { value: 'bulk', label: 'Hair care & styling', hint: 'Shampoo, conditioner and styling products.', match: (i) => i.type === 'bulk' && i.category !== 'Color' },
  { value: 'color', label: 'Color', hint: 'One row per shade.', match: (i) => i.category === 'Color' },
];

function statusFor(item) {
  if (!item.inUse) return 'Not in use';
  if (item.qty === 0) return 'Out';
  if (item.qty <= item.threshold) return 'Low';
  return 'In stock';
}

export default function Inventory() {
  const [items, setItems] = useState(inventoryItems);
  const [tab, setTab] = useState('per-use');
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyItem);
  const [message, setMessage] = useState('');

  function setQty(id, value) {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    setItems(items.map((i) => (i.id === id ? { ...i, qty } : i)));
  }

  function toggleInUse(id) {
    setItems(items.map((i) => (i.id === id ? { ...i, inUse: !i.inUse } : i)));
  }

  function update(e) {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  }

  function addItem(e) {
    e.preventDefault();
    setItems([...items, {
      id: Date.now(),
      name: `${newItem.brand} ${newItem.name}${newItem.size ? ` – ${newItem.size}` : ''}`,
      brand: newItem.brand,
      category: newItem.category,
      type: newItem.type,
      qty: Number(newItem.qty) || 0,
      threshold: Number(newItem.threshold) || 0,
      inUse: true,
      cost: newItem.cost === '' ? null : Number(newItem.cost),
    }]);
    setTab(newItem.category === 'Color' ? 'color' : newItem.type);
    setMessage(`${newItem.name} added.`);
    setNewItem(emptyItem);
    setShowForm(false);
  }

  const columns = [
    {
      key: 'inUse',
      label: 'In use',
      render: (r) => (
        <label className="switch">
          <input type="checkbox" checked={r.inUse} onChange={() => toggleInUse(r.id)} aria-label={`${r.name} in use`} />
          <span className="switch__track" aria-hidden="true" />
        </label>
      ),
    },
    { key: 'name', label: 'Item', render: (r) => <span className={r.inUse ? undefined : 'muted'}>{r.name}</span> },
    { key: 'category', label: 'Category' },
    {
      key: 'qty',
      label: 'On hand',
      render: (r) => (
        <div className="qty qty--input">
          <button type="button" aria-label={`One less ${r.name}`} onClick={() => setQty(r.id, r.qty - 1)} disabled={r.qty === 0}>
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={r.qty}
            onChange={(e) => setQty(r.id, e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label={`How many ${r.name} on hand`}
          />
          <button type="button" aria-label={`One more ${r.name}`} onClick={() => setQty(r.id, r.qty + 1)}>
            <Plus size={14} />
          </button>
        </div>
      ),
    },
    { key: 'threshold', label: 'Low at', align: 'right' },
    { key: 'cost', label: 'Cost', align: 'right', render: (r) => money(r.cost) },
    { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={statusFor(r)} /> },
  ];

  const currentTab = tabs.find((t) => t.value === tab);
  const visible = items.filter(currentTab.match);

  return (
    <>
      <DashboardHeader eyebrow="Stock" title="Inventory" subtitle="Update your counts and turn products on or off." showIcons>
        <button className="btn btn-dark btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? 'Close form' : 'New item'}
        </button>
      </DashboardHeader>

      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}

        {showForm && (
          <Panel title="New inventory item">
            <form className="form" onSubmit={addItem} style={{ marginTop: 12 }}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="type">Type</label>
                  <select id="type" name="type" value={newItem.type} onChange={update}>
                    <option value="per-use">Hair replacement supply</option>
                    <option value="bulk">Hair care, styling or color</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <select id="category" name="category" required value={newItem.category} onChange={update}>
                    <option value="" disabled>Select a category</option>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="name">Product name</label>
                  <input id="name" name="name" required value={newItem.name} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="brand">Brand</label>
                  <input id="brand" name="brand" required value={newItem.brand} onChange={update} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="size">Size or shade (optional)</label>
                  <input id="size" name="size" placeholder="e.g. 100ml or 6A" value={newItem.size} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="cost">Cost ($, optional)</label>
                  <input id="cost" name="cost" type="number" min="0" step="0.01" value={newItem.cost} onChange={update} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="qty">How many you have</label>
                  <input id="qty" name="qty" type="number" min="0" required value={newItem.qty} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="threshold">Show as low at</label>
                  <input id="threshold" name="threshold" type="number" min="0" required value={newItem.threshold} onChange={update} />
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
          <DataTable columns={columns} rows={visible} />
        </Panel>
      </div>
    </>
  );
}