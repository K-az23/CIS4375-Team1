import { useEffect, useState } from 'react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import { getLowStockInventory } from '../../services/inventory';

export default function InventoryLowStock({ inventory }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  // Read the backend's low-stock list. Read it again when the main inventory
  // changes, so a restock or correction also updates this list.
  useEffect(() => {
    const controller = new AbortController();
    async function loadLowStock() {
      try {
        const lowStockItems = await getLowStockInventory({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setItems(lowStockItems);
          setError('');
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }
    loadLowStock();
    return () => controller.abort();
  }, [inventory]);

  const columns = [
    { key: 'item_name', label: 'Item' },
    { key: 'quantity_on_hand', label: 'On hand' },
    { key: 'reorder_threshold', label: 'Reorder at' },
  ];

  return (
    <Panel title="Low stock">
      {!items && !error && <p role="status">Loading low stock…</p>}
      {error && <p role="alert" className="notice notice--warning">Couldn’t load low stock. {error}</p>}
      {!error && items && (
        <DataTable columns={columns} rows={items} emptyMessage="No active items are at or below their reorder level." />
      )}
    </Panel>
  );
}
