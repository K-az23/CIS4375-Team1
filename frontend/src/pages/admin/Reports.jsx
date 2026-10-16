import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import BarChart from '../../components/BarChart';
import DataTable from '../../components/DataTable';
import { weeklySales, inventoryItems, customers, money } from '../../data/sampleData';

export default function Reports() {
  const revenue = weeklySales.reduce((sum, d) => sum + d.value, 0);
  const inUse = inventoryItems.filter((i) => i.inUse);
  const lowCount = inUse.filter((i) => i.qty <= i.threshold).length;
  const average = Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length);
  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <>
      <DashboardHeader eyebrow="Insights" title="Reports" subtitle="Sales, inventory and customer spending." showIcons>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print</button>
      </DashboardHeader>

      <div className="report-grid">
        <div className="card">
          <div className="stat-card__label">Revenue · last 6 business days</div>
          <div className="stat-card__value">{money(revenue)}</div>
        </div>
        <div className="card">
          <div className="stat-card__label">Products running low</div>
          <div className="stat-card__value">{lowCount} of {inUse.length}</div>
        </div>
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