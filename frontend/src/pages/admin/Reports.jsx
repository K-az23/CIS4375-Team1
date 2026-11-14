import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import BarChart from '../../components/BarChart';
import DataTable from '../../components/DataTable';
import { isDemoMode } from '../../context/authUtils.js';
import {
  getInventoryDetails, getSalesReport, getCustomerSpending, getMembershipReport,
} from '../../services/reports';
import { weeklySales, inventoryItems, customers, money } from '../../data/sampleData';

// Keep the original sample information for demo mode only.
const demoSales = {
  days: weeklySales,
  total: weeklySales.reduce((sum, day) => sum + day.value, 0),
};
const demoSpending = {
  average_spend: customers.length
    ? customers.reduce((sum, customer) => sum + customer.totalSpent, 0) / customers.length : 0,
  customers: [...customers].sort((a, b) => b.totalSpent - a.totalSpent).map((customer) => ({
    user_id: customer.id, first_name: customer.name, last_name: '', email: customer.email,
    total_spent: customer.totalSpent, payment_count: null, last_payment_at: null,
  })),
};
const demoInventory = {
  low_stock_count: inventoryItems.filter((item) => item.qty <= item.threshold).length,
  items: inventoryItems.map((item) => ({
    item_id: item.id, item_name: item.name, quantity_on_hand: item.qty,
    reorder_threshold: item.threshold, unit: 'each', low_stock: item.qty <= item.threshold,
    restocked: 0, used: 0, adjusted: 0,
  })),
};

function ReportMessage({ loading, error, name }) {
  if (error) {
    return <p role="alert" className="notice notice--warning">Couldn’t load {name}. {error}</p>;
  }
  if (loading) return <p role="status">Loading {name}…</p>;
  return null;
}

function paymentDate(value) {
  if (!value) return '—';
  const date = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
}

export default function Reports() {
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [sales, setSales] = useState(isDemoMode ? demoSales : null);
  const [inventory, setInventory] = useState(isDemoMode ? demoInventory : null);
  const [spending, setSpending] = useState(isDemoMode ? demoSpending : null);
  const [memberships, setMemberships] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isDemoMode) return;
    const controller = new AbortController();

    // Each report loads on its own. One failed request does not hide the others.
    async function loadSales() {
      try {
        const result = await getSalesReport(days, { signal: controller.signal });
        if (!controller.signal.aborted) setSales(result);
      } catch (error) {
        if (!controller.signal.aborted) setErrors((old) => ({ ...old, sales: error.message }));
      }
    }
    async function loadInventory() {
      try {
        const result = await getInventoryDetails(days, { signal: controller.signal });
        if (!controller.signal.aborted) setInventory(result);
      } catch (error) {
        if (!controller.signal.aborted) setErrors((old) => ({ ...old, inventory: error.message }));
      }
    }
    async function loadSpending() {
      try {
        const result = await getCustomerSpending({ signal: controller.signal });
        if (!controller.signal.aborted) setSpending(result);
      } catch (error) {
        if (!controller.signal.aborted) setErrors((old) => ({ ...old, spending: error.message }));
      }
    }
    async function loadMemberships() {
      try {
        const result = await getMembershipReport({ signal: controller.signal });
        if (!controller.signal.aborted) setMemberships(result);
      } catch (error) {
        if (!controller.signal.aborted) setErrors((old) => ({ ...old, memberships: error.message }));
      }
    }
    loadSales();
    loadInventory();
    loadSpending();
    loadMemberships();
    return () => controller.abort();
  }, [days, refresh]);

  // Clear the old results before requesting a new range or retrying a failure.
  function reload(nextDays) {
    setDays(nextDays);
    setSales(null);
    setInventory(null);
    setSpending(null);
    setMemberships(null);
    setErrors({});
    setRefresh((old) => old + 1);
  }

  return (
    <>
      <DashboardHeader eyebrow="Insights" title="Reports" subtitle="Sales, inventory, customer spending and memberships." showIcons>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print</button>
      </DashboardHeader>

      {isDemoMode ? <p className="muted">Demo reports use sample data.</p> : (
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="report-days">Sales and inventory movement</label>
            <select id="report-days" value={days} onChange={(event) => reload(Number(event.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div><button className="btn btn-outline" onClick={() => reload(days)}>Refresh reports</button></div>
        </div>
      )}
      <p className="muted">Sales dates follow Central Time. Spending totals are all-time; stock and membership counts are current.</p>
      <p className="field-hint">Revenue includes successful payments and excludes payments marked refunded. Profitability is unavailable because costs are not recorded per sale.</p>

      <div className="report-grid">
        <div className="card">
          <div className="stat-card__label">Revenue · {isDemoMode ? 'sample days' : `last ${days} days`}</div>
          <ReportMessage loading={!sales} error={errors.sales} name="sales report" />
          {sales && <div className="stat-card__value">{money(sales.total)}</div>}
        </div>
        <div className="card">
          <div className="stat-card__label">Inventory items at reorder level</div>
          <ReportMessage loading={!inventory} error={errors.inventory} name="inventory report" />
          {inventory?.items.length === 0 && <p className="muted">No active inventory items.</p>}
          {inventory?.items.length > 0 && <div className="stat-card__value">{inventory.low_stock_count} of {inventory.items.length}</div>}
        </div>
        <div className="card">
          <div className="stat-card__label">Average spend per paying customer · all-time</div>
          <ReportMessage loading={!spending} error={errors.spending} name="customer spending report" />
          {spending && <div className="stat-card__value">{money(spending.average_spend)}</div>}
        </div>
      </div>

      <div className="two-col">
        <Panel title="Revenue by day">
          <ReportMessage loading={!sales} error={errors.sales} name="sales report" />
          {sales && (sales.total === 0 ? <p className="muted">No successful payments in this period.</p> : (
            sales.days.length <= 7 ? <BarChart data={sales.days} /> : (
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                <DataTable
                  columns={[
                    { key: 'date', label: 'Date', nowrap: true },
                    { key: 'value', label: 'Revenue', align: 'right', render: (row) => money(row.value) },
                  ]}
                  rows={sales.days.map((row) => ({ ...row, id: row.date }))}
                />
              </div>
            )
          ))}
        </Panel>
        <Panel title="Customer spending · all-time">
          <ReportMessage loading={!spending} error={errors.spending} name="customer spending report" />
          {spending && <DataTable
            columns={[
              { key: 'name', label: 'Customer', render: (row) => `${row.first_name} ${row.last_name}`.trim() },
              { key: 'last_payment_at', label: 'Last payment', nowrap: true, render: (row) => paymentDate(row.last_payment_at) },
              { key: 'payment_count', label: 'Payments', align: 'right', render: (row) => row.payment_count ?? '—' },
              { key: 'total_spent', label: 'Total spent', align: 'right', render: (row) => money(row.total_spent) },
            ]}
            rows={spending.customers.map((row) => ({ ...row, id: row.user_id }))}
            emptyMessage="No customer payments yet."
          />}
        </Panel>
      </div>

      <div style={{ marginTop: 20 }}>
        <Panel title="Inventory">
          <p className="field-hint">Current active stock. Restocked, used and corrections cover the selected period. Starting stock is excluded from movements. Usage without a recorded date is not included.</p>
          <ReportMessage loading={!inventory} error={errors.inventory} name="inventory report" />
          {inventory && <DataTable
            columns={[
              { key: 'item_name', label: 'Item' },
              { key: 'quantity_on_hand', label: 'On hand', align: 'right', render: (row) => row.quantity_on_hand ?? '—' },
              { key: 'reorder_threshold', label: 'Reorder at', align: 'right', render: (row) => row.reorder_threshold ?? '—' },
              { key: 'unit', label: 'Unit' },
              { key: 'restocked', label: 'Restocked', align: 'right' },
              { key: 'used', label: 'Used', align: 'right' },
              { key: 'adjusted', label: 'Corrections', align: 'right' },
              { key: 'low_stock', label: 'Status', render: (row) => row.quantity_on_hand == null || row.reorder_threshold == null ? 'Not set' : (row.low_stock ? 'Low stock' : 'In stock') },
            ]}
            rows={inventory.items.map((row) => ({ ...row, id: row.item_id }))}
            emptyMessage="No active inventory items."
          />}
        </Panel>
      </div>

      <div style={{ marginTop: 20 }}>
        <Panel title="Memberships">
          <p className="field-hint">Current customer membership flags. Renewal dates and membership fees are not tracked here.</p>
          {isDemoMode ? <p className="muted">Membership reporting is available with live customer data.</p> : (
            <>
              <ReportMessage loading={!memberships} error={errors.memberships} name="membership report" />
              {memberships && <>
                <p>{memberships.active_members} active members · {memberships.non_members} active non-members · {memberships.inactive_members} inactive members</p>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Member', render: (row) => `${row.first_name} ${row.last_name}`.trim() },
                    { key: 'email', label: 'Email' },
                    { key: 'is_active', label: 'Account status', render: (row) => row.is_active ? 'Active' : 'Inactive' },
                  ]}
                  rows={memberships.members.map((row) => ({ ...row, id: row.user_id }))}
                  emptyMessage="No members yet."
                />
              </>}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
