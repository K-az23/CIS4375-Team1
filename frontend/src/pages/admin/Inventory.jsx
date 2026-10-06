import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ServiceTabs from '../../components/ServiceTabs';
import { inventoryItems, money } from '../../data/sampleData';

const categories = ['Adhesive', 'Supplies', 'Hair care', 'Styling', 'Color', 'Other'];
const emptyItem = { type: 'per-use', category: '', name: '', brand: '', size: '', qty: '', threshold: '', cost: '' };

const tabs = [
  { value: 'per-use', label: 'Hair replacement supplies', hint: 'Logged per appointment on the Checkout page and deducted automatically.', match: (i) => i.type === 'per-use' },
  { value: 'bulk', label: 'Hair care & styling', hint: 'Not tied to appointments. Mark one used when a bottle runs out.', match: (i) => i.type === 'bulk' && i.category !== 'Color' },
  { value: 'color', label: 'Color', hint: 'One row per shade. Mark one used when a tube runs out.', match: (i) => i.category === 'Color' },
];

export default function Inventory() {
  const [items, setItems] = useState(inventoryItems);
  const [tab, setTab] = useState('per-use');
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyItem);
  const [message, setMessage] = useState('');

  function updateQty(id, change, note) {
    setItems(items.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + change) } : i)));
    setMessage(note);
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
      qty: Number(newItem.qty),
      threshold: Number(newItem.threshold),
      lastOrderQty: Number(newItem.qty) || 10,
      cost: newItem.cost === '' ? null : Number(newItem.cost),
    }]);
    setTab(newItem.category === 'Color' ? 'color' : newItem.type);
    setMessage(`${newItem.name} added.`);
    setNewItem(emptyItem);
    setShowForm(false);
  }

  const columns = [
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'qty', label: 'On hand', align: 'right' },
    { key: 'threshold', label: 'Reorder at', align: 'right' },
    { key: 'cost', label: 'Cost', align: 'right', render: (r) => money(r.cost) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.qty === 0 ? 'Out' : r.qty <= r.threshold ? 'Low' : 'In stock'} /> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
          {r.type === 'bulk' && (
            <button className="btn btn-outline btn-sm" onClick={() => updateQty(r.id, -1, `Marked one ${r.name} as used.`)} disabled={r.qty === 0}>
              Mark one used
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => updateQty(r.id, r.lastOrderQty, `Re-stocked ${r.lastOrderQty} × ${r.name}.`)}>
            Re-stock +{r.lastOrderQty}
          </button>
        </div>
      ),
    },
  ];

  const currentTab = tabs.find((t) => t.value === tab);
  const visible = items.filter(currentTab.match);

  return (
    <>
      <DashboardHeader eyebrow="Stock" title="Inventory" subtitle="You'll get an email when an item reaches its reorder level." showIcons>
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
                  <label htmlFor="type">How it's used</label>
                  <select id="type" name="type" value={newItem.type} onChange={update}>
                    <option value="per-use">Per use – logged at checkout</option>
                    <option value="bulk">Bulk – mark used when empty</option>
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
                  <label htmlFor="size">Size</label>
                  <input id="size" name="size" placeholder="e.g. 100ml or 6A (optional)" value={newItem.size} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="cost">Cost ($)</label>
                  <input id="cost" name="cost" type="number" min="0" step="0.01" value={newItem.cost} onChange={update} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="qty">Starting quantity</label>
                  <input id="qty" name="qty" type="number" min="0" required value={newItem.qty} onChange={update} />
                </div>
                <div className="field">
                  <label htmlFor="threshold">Reorder at</label>
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