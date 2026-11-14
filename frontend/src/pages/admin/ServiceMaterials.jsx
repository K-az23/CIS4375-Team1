import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import Panel from '../../components/Panel';
import { isDemoMode } from '../../context/authUtils.js';
import { getServiceMaterials, saveServiceMaterials } from '../../services/serviceMaterials';
import { getServices } from '../../services/services';
import { getInventory } from '../../services/inventory';

// Show the brand with the name when an item has a brand.
function itemName(item) {
  return [item.brand, item.item_name].filter(Boolean).join(' ');
}

function MaterialsList({ serviceId, onBusyChange, onEditingChange }) {
  const [materials, setMaterials] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [draft, setDraft] = useState([]);
  const [editing, setEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loadError, setLoadError] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Load this service's defaults and the inventory choices. Cancel old
  // requests if the admin switches services before the requests finish.
  useEffect(() => {
    const controller = new AbortController();
    async function loadMaterials() {
      try {
        const saved = await getServiceMaterials(serviceId, { signal: controller.signal });
        if (!controller.signal.aborted) setMaterials(saved);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error.message);
      }
    }
    async function loadInventory() {
      try {
        const items = await getInventory({ signal: controller.signal });
        if (!Array.isArray(items)) throw new Error('The inventory response was unexpected.');
        if (!controller.signal.aborted) setInventory(items);
      } catch (error) {
        if (!controller.signal.aborted) setInventoryError(error.message);
      }
    }
    loadMaterials();
    loadInventory();
    return () => controller.abort();
  }, [serviceId]);

  // Work on a copy until Save is clicked. Cancel leaves the saved list alone.
  function startEditing() {
    setDraft(materials.map((material) => ({ ...material })));
    setSelectedItem('');
    setQuantity('1');
    setActionError('');
    setMessage('');
    setEditing(true);
    onEditingChange(true);
  }

  function cancelEditing() {
    setEditing(false);
    onEditingChange(false);
    setActionError('');
  }

  // Add an active item to the draft. Already selected items are hidden
  // from the dropdown, so one item does not appear twice.
  function addMaterial(event) {
    event.preventDefault();
    setActionError('');
    const item = inventory.find((item) => String(item.item_id) === selectedItem);
    const amount = Number(quantity);
    if (!item || !item.is_active) {
      setActionError('Choose an active inventory item.');
      return;
    }
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 2147483647) {
      setActionError('Enter a positive whole number for the default quantity.');
      return;
    }
    if (draft.some((material) => material.item_id === item.item_id)) {
      setActionError('That item is already in the list.');
      return;
    }
    setDraft([...draft, {
      item_id: item.item_id,
      item_name: item.item_name,
      brand: item.brand,
      unit: item.unit,
      is_active: item.is_active,
      default_quantity_used: amount,
    }]);
    setSelectedItem('');
    setQuantity('1');
  }

  function changeQuantity(itemId, value) {
    setDraft(draft.map((material) => material.item_id === itemId
      ? { ...material, default_quantity_used: value }
      : material));
  }

  function removeMaterial(itemId) {
    setDraft(draft.filter((material) => material.item_id !== itemId));
  }

  // Send only item IDs and quantities. Saving defaults does not use stock.
  // Keep the draft on screen if the server rejects the change.
  async function saveMaterials(event) {
    event.preventDefault();
    setActionError('');
    setMessage('');
    const rows = [];
    for (const material of draft) {
      const amount = Number(material.default_quantity_used);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 2147483647) {
        setActionError('Every default quantity must be a positive whole number.');
        return;
      }
      if (!material.is_active) {
        setActionError('Remove inactive inventory items before saving.');
        return;
      }
      rows.push({ item_id: material.item_id, default_quantity_used: amount });
    }
    if (rows.length === 0 && materials.length > 0) {
      const confirmed = window.confirm('Save an empty materials list for this service?');
      if (!confirmed) return;
    }

    setSaving(true);
    onBusyChange(true);
    try {
      const saved = await saveServiceMaterials(serviceId, rows);
      setMaterials(saved);
      setEditing(false);
      onEditingChange(false);
      setMessage('Service materials saved.');
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  const availableItems = inventory?.filter((item) => item.is_active && !draft.some((material) => material.item_id === item.item_id));
  const columns = [
    { key: 'item_name', label: 'Inventory item', render: (material) => itemName(material) + (material.is_active ? '' : ' (inactive)') },
    { key: 'default_quantity_used', label: 'Default quantity', render: (material) => material.default_quantity_used ?? '—' },
    { key: 'unit', label: 'Unit', render: (material) => material.unit || '—' },
  ];
  const editColumns = [
    columns[0],
    { key: 'default_quantity_used', label: 'Default quantity', render: (material) => (
      <input type="number" min="1" max="2147483647" step="1" required disabled={saving}
        aria-label={`Default quantity for ${itemName(material)}`}
        value={material.default_quantity_used ?? ''}
        onChange={(event) => changeQuantity(material.item_id, event.target.value)} />
    ) },
    columns[2],
    { key: 'actions', label: '', render: (material) => (
      <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => removeMaterial(material.item_id)}>Remove</button>
    ) },
  ];
  const savedRows = materials?.map((material) => ({ ...material, id: material.item_id }));
  const draftRows = draft.map((material) => ({ ...material, id: material.item_id }));

  return (
    <div className="page-stack">
      {!materials && !loadError && <p role="status">Loading materials…</p>}
      {loadError && <p role="alert" className="notice notice--warning">Couldn’t load materials. {loadError}</p>}
      {inventoryError && <p role="alert" className="notice notice--warning">Couldn’t load inventory choices. {inventoryError}</p>}
      {actionError && <p role="alert" className="notice notice--warning">{actionError}</p>}
      {message && <p role="status" className="notice">{message}</p>}
      {materials && !editing && (
        <>
          <DataTable columns={columns} rows={savedRows} emptyMessage="No materials are configured for this service." />
          <div><button type="button" className="btn btn-outline" disabled={!inventory} onClick={startEditing}>Edit materials</button></div>
        </>
      )}

      {/* Changes stay in this draft until Save default materials is clicked. */}
      {editing && (
        <>
          <form className="form" onSubmit={addMaterial}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="bom-item">Inventory item</label>
                <select id="bom-item" required disabled={saving || !availableItems?.length} value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)}>
                  <option value="">Select an item</option>
                  {availableItems?.map((item) => <option key={item.item_id} value={item.item_id}>{itemName(item)} ({item.unit})</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bom-quantity">Default quantity</label>
                <input id="bom-quantity" type="number" min="1" max="2147483647" step="1" required disabled={saving} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
            </div>
            {!availableItems?.length && <p className="field-hint">No additional active inventory items are available.</p>}
            <div><button className="btn btn-outline" disabled={saving || !availableItems?.length}>Add to list</button></div>
          </form>
          <form className="form" onSubmit={saveMaterials}>
            <DataTable columns={editColumns} rows={draftRows} emptyMessage="No materials selected. Saving will leave this service with no default materials." />
            <div className="row">
              <button className="btn btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save default materials'}</button>
              <button type="button" className="btn btn-outline" disabled={saving} onClick={cancelEditing}>Cancel</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function ServiceMaterials() {
  const [services, setServices] = useState(null);
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState(false);

  // Keep the existing service dropdown connected to the public services API.
  useEffect(() => {
    if (isDemoMode) return;
    const controller = new AbortController();
    async function loadServices() {
      try {
        const result = await getServices({ signal: controller.signal });
        if (!Array.isArray(result)) throw new Error('The server returned an invalid services list.');
        if (!controller.signal.aborted) setServices(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }
    loadServices();
    return () => controller.abort();
  }, []);

  return (
    <Panel title="Service materials">
      <div className="stack">
        {isDemoMode && <p className="muted">Sign in as an admin to manage service materials.</p>}
        {!isDemoMode && !services && !error && <p role="status">Loading services…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load services. {error}</p>}
        {services?.length === 0 && <p className="muted">No active services are available.</p>}
        {services?.length > 0 && (
          <>
            <p className="field-hint">Set the default materials for a service. Saving this list does not change stock quantities.</p>
            <div className="field">
              <label htmlFor="materials-service">Service</label>
              <select id="materials-service" disabled={saving || editingMaterials} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                <option value="">Select a service</option>
                {services.map((service) => <option key={service.service_id} value={service.service_id}>{service.service_name}</option>)}
              </select>
            </div>
            {editingMaterials && <p className="field-hint">Save or cancel your changes before choosing another service.</p>}
          </>
        )}
        {serviceId && <MaterialsList key={serviceId} serviceId={serviceId} onBusyChange={setSaving} onEditingChange={setEditingMaterials} />}
      </div>
    </Panel>
  );
}
