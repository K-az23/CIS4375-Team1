import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import BarChart from '../../components/BarChart';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { customerName, formatDate } from '../../api/format';
import { money } from '../../data/sampleData';

const SALES_DAYS = 7;
const INVENTORY_DAYS = 30;

export default function Reports() {
  const [sales, setSales] = useState({ days: [], total: 0 });
  const [spending, setSpending] = useState({ customers: [], average_spend: 0 });
  const [inventory, setInventory] = useState({ items: [], low_stock_count: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api(`/api/admin/reports/sales?days=${SALES_DAYS}`),
      api('/api/admin/reports/customer-spending'),
      api(`/api/admin/reports/inventory?days=${INVENTORY_DAYS}`),
    ])
      .then(([salesData, spendingData, inventoryData]) => {
        setSales(salesData);
        setSpending(spendingData);
        setInventory(inventoryData);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <DashboardHeader eyebrow="Insights" title="Reports" subtitle="Sales, inventory and customer spending." showIcons>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print</button>
      </DashboardHeader>

      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

      <div className="report-grid">
        <div className="card">
          <div className="stat-card__label">Revenue · last {SALES_DAYS} days</div>
          <div className="stat-card__value">{money(sales.total)}</div>
        </div>
        <div className="card">
          <div className="stat-card__label">Inventory items at reorder level</div>
          <div className="stat-card__value">{inventory.low_stock_count} of {inventory.items.length}</div>
        </div>
        <div className="card">
          <div className="stat-card__label">Average spend per customer</div>
          <div className="stat-card__value">{money(spending.average_spend)}</div>
        </div>
      </div>

      <div className="page-stack">
      <div className="two-col">
        <Panel title="Revenue by day">
          <BarChart data={sales.days} />
        </Panel>
        <Panel title="Top customers">
          <DataTable
            columns={[
              { key: 'name', label: 'Customer', render: (r) => customerName(r) },
              { key: 'lastPayment', label: 'Last payment', nowrap: true, render: (r) => formatDate(r.last_payment_at) },
              { key: 'totalSpent', label: 'Total spent', align: 'right', render: (r) => money(r.total_spent) },
            ]}
            rows={spending.customers.map((c) => ({ ...c, id: c.user_id }))}
            emptyMessage="No paid orders yet."
          />
        </Panel>
      </div>

      <Panel title={`Inventory · last ${INVENTORY_DAYS} days`}>
        <DataTable
          columns={[
            { key: 'item_name', label: 'Item' },
            { key: 'quantity_on_hand', label: 'On hand', align: 'right' },
            { key: 'reorder_threshold', label: 'Reorder at', align: 'right' },
            { key: 'restocked', label: 'Restocked', align: 'right' },
            { key: 'used', label: 'Used', align: 'right' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.quantity_on_hand === 0 ? 'Out' : r.low_stock ? 'Low' : 'In stock'} /> },
          ]}
          rows={inventory.items.map((i) => ({ ...i, id: i.item_id }))}
          emptyMessage="No inventory items yet."
        />
      </Panel>
      </div>
    </>
  );
}
