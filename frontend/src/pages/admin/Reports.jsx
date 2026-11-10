import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import BarChart from '../../components/BarChart';
import DataTable from '../../components/DataTable';
import { isDemoMode } from '../../context/authUtils.js';
import { getInventoryReport } from '../../services/reports';
import { weeklySales, inventoryItems, customers, money } from '../../data/sampleData';

const demoInventory = {
  total_items: inventoryItems.length,
  items_at_reorder_level: inventoryItems.filter((item) => item.qty <= item.threshold).length,
};

function InventorySummary() {
  const [inventory, setInventory] = useState(isDemoMode ? demoInventory : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadInventory() {
      try {
        const report = await getInventoryReport({ signal: controller.signal });
        const { total_items: total, items_at_reorder_level: atReorder } = report ?? {};

        if (!Number.isInteger(total) || !Number.isInteger(atReorder) ||
            total < 0 || atReorder < 0 || atReorder > total) {
          throw new Error('The server returned invalid inventory counts.');
        }

        if (!controller.signal.aborted) setInventory(report);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadInventory();
    return () => controller.abort();
  }, []);

  return (
    <div className="card">
      <div className="stat-card__label">Inventory items at reorder level</div>
      {!inventory && !error && <p role="status">Loading inventory report…</p>}
      {error && <p role="alert" className="notice notice--warning">Couldn’t load inventory report. {error}</p>}
      {inventory?.total_items === 0 && <p className="muted">No active inventory items.</p>}
      {inventory?.total_items > 0 && (
        <div className="stat-card__value">
          {inventory.items_at_reorder_level} of {inventory.total_items}
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const revenue = weeklySales.reduce((sum, d) => sum + d.value, 0);
  const average = Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length);
  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <>
      <DashboardHeader eyebrow="Insights" title="Reports" subtitle="Sales, inventory and customer spending." showIcons>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print</button>
      </DashboardHeader>

      {!isDemoMode && <p className="muted">Sales and customer spending use sample data.</p>}

      <div className="report-grid">
        <div className="card">
          <div className="stat-card__label">Revenue · last 6 business days</div>
          <div className="stat-card__value">{money(revenue)}</div>
        </div>
        <InventorySummary />
        <div className="card">
          <div className="stat-card__label">Average spend per customer</div>
          <div className="stat-card__value">{money(average)}</div>
        </div>
      </div>

      <div className="two-col">
        <Panel title="Revenue by day">
          <BarChart data={weeklySales} />
        </Panel>
        <Panel title="Top customers">
          <DataTable
            columns={[
              { key: 'name', label: 'Customer' },
              { key: 'lastVisit', label: 'Last visit', nowrap: true },
              { key: 'totalSpent', label: 'Total spent', align: 'right', render: (r) => money(r.totalSpent) },
            ]}
            rows={topCustomers}
          />
        </Panel>
      </div>
    </>
  );
}
