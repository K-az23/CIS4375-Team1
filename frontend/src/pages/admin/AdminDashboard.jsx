import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Package, PackageMinus, DollarSign, Receipt, FileCheck, Truck, FileText } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import BarChart from '../../components/BarChart';
import { useAuth } from '../../context/useAuth.js';
import { business } from '../../data/business';
import { api } from '../../api/client';
import { adminOrderStatusLabel, customerName, formatTime, todayIso } from '../../api/format';
import { money } from '../../data/sampleData';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const apptColumns = [
  { key: 'time', label: 'Time', nowrap: true, render: (r) => formatTime(r.appointment_time) },
  { key: 'customer', label: 'Client', nowrap: true, render: (r) => customerName(r.customer) },
  { key: 'services', label: 'Service', render: (r) => r.service?.service_name ?? '—' },
  { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={r.status === 'no_show' ? 'No-show' : r.status === 'completed' ? 'Completed' : 'Confirmed'} /> },
];

const orderColumns = [
  { key: 'customer', label: 'Client', render: (r) => customerName(r.customer) },
  { key: 'type', label: 'Type', render: (r) => (r.order_type === 'full' ? 'Custom' : 'Area') },
  { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={adminOrderStatusLabel(r.order_status)} /> },
];

const stockColumns = [
  { key: 'item_name', label: 'Product' },
  { key: 'quantity_on_hand', label: 'Qty', align: 'right' },
];

const SALES_DAYS = 7;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const today = todayIso();
    // Appointments come from Setmore through the backend; empty until that's available.
    api(`/api/admin/appointments?start=${today}&end=${today}`)
      .then((data) => setAppointments(data.appointments ?? []))
      .catch(() => {});
    api('/api/admin/hairpiece-orders').then((data) => setOrders(data.orders)).catch(() => {});
    api('/api/admin/inventory-items/low-stock').then((data) => setLowStock(data.items)).catch(() => {});
    api(`/api/admin/reports/sales?days=${SALES_DAYS}`).then((data) => setSales(data.days)).catch(() => {});
  }, []);

  // Paid orders to place with the vendor, and invoices still waiting on the client.
  const needsAction = orders.filter((o) => ['pending', 'invoice_sent'].includes(o.order_status));
  const todaySales = sales.find((d) => d.today)?.value ?? 0;

  return (
    <>
      <DashboardHeader
        eyebrow="Owner dashboard"
        title={`${greeting()}, ${user?.firstName || 'Admin'}`}        subtitle={`Here's what's happening at ${business.name} today.`}
        showIcons
      />

      <div className="stat-grid">
        <StatCard icon={CalendarDays} label="Appointments today" value={appointments.length} linkLabel="Open calendar" to="/admin/calendar" />
        <StatCard icon={Package} label="Hair orders to handle" value={needsAction.length} linkLabel="Hair orders" to="/admin/purchasing" />
        <StatCard icon={PackageMinus} label="Low stock items" value={lowStock.length} linkLabel="Inventory" to="/admin/inventory" />
        <StatCard icon={DollarSign} label="Sales today" value={money(todaySales)} linkLabel="Reports" to="/admin/reports" />
      </div>

      <div className="admin-grid">
        <div className="admin-col">
          <Panel title="Today's appointments" linkLabel="Check out" to="/admin/checkout">
            <DataTable columns={apptColumns} rows={appointments.map((a) => ({ ...a, id: a.setmore_booking_id }))} emptyMessage="No appointments today." />
          </Panel>
        </div>

        <div className="admin-col">
          <Panel title="Orders to handle" linkLabel="View all" to="/admin/purchasing">
            <DataTable columns={orderColumns} rows={needsAction.map((o) => ({ ...o, id: o.order_id }))} emptyMessage="Nothing to order right now." />
          </Panel>
          <Panel title="Low stock" linkLabel="View all" to="/admin/inventory">
            <DataTable columns={stockColumns} rows={lowStock.map((i) => ({ ...i, id: i.item_id }))} emptyMessage="Everything is stocked." />
          </Panel>
        </div>

        <div className="admin-col">
          <Panel title={`Sales, last ${SALES_DAYS} days`}>
            <BarChart data={sales} />
          </Panel>
          <Panel title="Quick actions">
            <div className="qa-grid">
              <button className="qa-btn" onClick={() => navigate('/admin/checkout')}><Receipt size={16} /> Check out client</button>
              <button className="qa-btn" onClick={() => navigate('/admin/purchasing')}><FileCheck size={16} /> New custom order</button>
              <button className="qa-btn" onClick={() => navigate('/admin/purchasing')}><Truck size={16} /> Order hair</button>
              <button className="qa-btn" onClick={() => navigate('/admin/reports')}><FileText size={16} /> Reports</button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}