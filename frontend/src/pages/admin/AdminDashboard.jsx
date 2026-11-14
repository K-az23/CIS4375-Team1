import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Package, PackageMinus, DollarSign,
  Receipt, FileCheck, Truck, FileText,
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import BarChart from '../../components/BarChart';
import { useAuth } from '../../context/useAuth.js';
import { isDemoMode } from '../../context/authUtils.js';
import { business } from '../../data/business';
import {
  todaysAppointments, hairOrders, inventoryItems, weeklySales, money,
} from '../../data/sampleData';
import {
  getAdminAppointments, appointmentDate, appointmentStatuses, salonDate,
} from '../../services/appointments';
import { getAdminOrders, orderStatuses } from '../../services/orders';
import {
  getInventoryDetails, getSalesReport,
} from '../../services/reports';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const apptColumns = [
  { key: 'time', label: 'Time · Central', nowrap: true },
  { key: 'customer', label: 'Client' },
  {
    key: 'services',
    label: 'Service',
    render: (row) => row.services.join(', '),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const orderColumns = [
  { key: 'customer', label: 'Client' },
  { key: 'type', label: 'Type' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const stockColumns = [
  { key: 'name', label: 'Product' },
  { key: 'qty', label: 'Qty', align: 'right' },
];

const emptyData = {
  appointments: null,
  orders: null,
  stock: null,
  sales: null,
};

// Keep the original examples available only when demo mode is selected.
const demoData = {
  appointments: todaysAppointments,
  orders: hairOrders.filter((order) =>
    ['Pending', 'Invoice sent'].includes(order.status)
  ),
  stock: inventoryItems.filter((item) => item.qty <= item.threshold),
  sales: { days: weeklySales },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(isDemoMode ? demoData : emptyData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!isDemoMode);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    // Each section loads separately. If one request fails, the other
    // sections can still show real results instead of sample data.
    async function loadSection(name, request) {
      try {
        const result = await request();

        if (!controller.signal.aborted) {
          setData((current) => ({
            ...current,
            [name]: result,
          }));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrors((current) => ({
            ...current,
            [name]: error.message,
          }));
        }
      }
    }

    async function loadDashboard() {
      const options = { signal: controller.signal };
      const today = salonDate();

      await Promise.all([
        loadSection('appointments', async () => {
          const rows = await getAdminAppointments({
            start: today,
            end: today,
            ...options,
          });

          return rows
            .filter((row) => row.status !== 'cancelled')
            .map((row) => ({
              id: row.setmore_booking_id,
              time: appointmentDate(row.appointment_time),
              customer: row.customer?.name || 'Setmore guest',
              services: [row.service_name || 'Service unavailable'],
              status: row.setmore_missing
                ? 'Needs verification'
                : appointmentStatuses[row.status] || row.status,
            }));
        }),

        loadSection('orders', async () => {
          const rows = await getAdminOrders(options);

          return rows
            .filter((row) =>
              ['invoice_sent', 'pending', 'ordered'].includes(
                row.order_status
              )
            )
            .map((row) => ({
              id: row.order_id,
              customer: (
                `${row.customer?.first_name || ''} ` +
                `${row.customer?.last_name || ''}`
              ).trim() || 'Customer',
              type: row.system_label || row.order_type,
              status: orderStatuses[row.order_status] || row.order_status,
            }));
        }),

        loadSection('stock', async () => {
          const report = await getInventoryDetails(7, options);

          return report.items
            .filter((item) => item.low_stock)
            .map((item) => ({
              id: item.item_id,
              name: item.item_name,
              qty: item.quantity_on_hand,
            }));
        }),

        loadSection('sales', () => getSalesReport(7, options)),
      ]);

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [refresh]);

  function reload() {
    setData(emptyData);
    setErrors({});
    setLoading(true);
    setRefresh((current) => current + 1);
  }

  const todaySales = data.sales?.days.find((day) => day.today)?.value;

  // Show errors and loading messages separately from a real empty result.
  function section(name, content) {
    if (errors[name]) {
      return (
        <p role="alert" className="notice notice--warning">
          Couldn't load this section. {errors[name]}
        </p>
      );
    }

    if (data[name] === null) {
      return <p role="status">Loading…</p>;
    }

    return content;
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Owner dashboard"
        title={`${greeting()}, ${user?.firstName || 'Admin'}`}
        subtitle={`Here's what's happening at ${business.name} today.`}
        showIcons
      >
        {!isDemoMode && (
          <button
            className="btn btn-outline"
            disabled={loading}
            onClick={reload}
          >
            {loading ? 'Refreshing…' : 'Refresh dashboard'}
          </button>
        )}
      </DashboardHeader>

      {!isDemoMode && (
        <p className="field-hint">
          Dates follow Central Time. Appointments reflect the latest
          Calendar sync. Sales include successful payments and exclude
          payments marked refunded.
        </p>
      )}

      <div className="stat-grid">
        <StatCard
          icon={CalendarDays}
          label="Appointments today"
          value={data.appointments?.length ?? '—'}
          linkLabel="Open calendar"
          to="/admin/calendar"
        />
        <StatCard
          icon={Package}
          label="Open customer orders"
          value={data.orders?.length ?? '—'}
          linkLabel="Hair orders"
          to="/admin/orders"
        />
        <StatCard
          icon={PackageMinus}
          label="Low stock items"
          value={data.stock?.length ?? '—'}
          linkLabel="Inventory"
          to="/admin/inventory"
        />
        <StatCard
          icon={DollarSign}
          label="Sales today"
          value={todaySales === undefined ? '—' : money(todaySales)}
          linkLabel="Reports"
          to="/admin/reports"
        />
      </div>

      <div className="admin-grid">
        <div className="admin-col">
          <Panel
            title="Today's appointments"
            linkLabel="Check out"
            to="/admin/checkout"
          >
            {section(
              'appointments',
              <DataTable
                columns={apptColumns}
                rows={data.appointments || []}
                emptyMessage="No appointments today."
              />
            )}
          </Panel>
        </div>

        <div className="admin-col">
          <Panel
            title="Open customer orders"
            linkLabel="View all"
            to="/admin/orders"
          >
            {section(
              'orders',
              <DataTable
                columns={orderColumns}
                rows={data.orders || []}
                emptyMessage="No open customer orders."
              />
            )}
          </Panel>

          <Panel
            title="Low stock"
            linkLabel="View all"
            to="/admin/inventory"
          >
            {section(
              'stock',
              <DataTable
                columns={stockColumns}
                rows={data.stock || []}
                emptyMessage="Everything is stocked."
              />
            )}
          </Panel>
        </div>

        <div className="admin-col">
          <Panel title={isDemoMode ? 'Sample sales' : 'Sales, last 7 days'}>
            {section(
              'sales',
              <BarChart data={data.sales?.days || []} />
            )}
          </Panel>

          <Panel title="Quick actions">
            <div className="qa-grid">
              <button
                className="qa-btn"
                onClick={() => navigate('/admin/checkout')}
              >
                <Receipt size={16} /> Check out client
              </button>

              <button
                className="qa-btn"
                onClick={() => navigate('/admin/orders')}
              >
                <FileCheck size={16} /> New customer invoice
              </button>

              <button
                className="qa-btn"
                onClick={() => navigate('/admin/purchasing')}
              >
                <Truck size={16} /> Supplier purchases
              </button>

              <button
                className="qa-btn"
                onClick={() => navigate('/admin/reports')}
              >
                <FileText size={16} /> Reports
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}