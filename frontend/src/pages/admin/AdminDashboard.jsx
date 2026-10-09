import { useNavigate } from 'react-router-dom';
import { CalendarDays, Package, PackageMinus, DollarSign, Receipt, FileCheck, Truck, FileText } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import BarChart from '../../components/BarChart';
import { useAuth } from '../../context/AuthContext';
import { business } from '../../data/business';
import { todaysAppointments, hairOrders, inventoryItems, weeklySales, money } from '../../data/sampleData';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const apptColumns = [
  { key: 'time', label: 'Time', nowrap: true },
  { key: 'customer', label: 'Client', nowrap: true },
  { key: 'services', label: 'Service', render: (r) => r.services.join(', ') },
  { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={r.status} /> },
];

const orderColumns = [
  { key: 'customer', label: 'Client' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={r.status} /> },
];

const stockColumns = [
  { key: 'name', label: 'Product' },
  { key: 'qty', label: 'Qty', align: 'right' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const needsAction = hairOrders.filter((o) => ['Pending', 'Invoice sent'].includes(o.status));
  const lowStock = inventoryItems.filter((i) => i.qty <= i.threshold);
  const todaySales = weeklySales.find((d) => d.today)?.value ?? 0;

  return (
    <>
      <DashboardHeader
        eyebrow="Owner dashboard"
        title={`${greeting()}, ${user?.firstName || 'Admin'}`}        subtitle={`Here's what's happening at ${business.name} today.`}
        showIcons
      />

      <div className="stat-grid">
        <StatCard icon={CalendarDays} label="Appointments today" value={todaysAppointments.length} linkLabel="Open calendar" to="/admin/calendar" />
        <StatCard icon={Package} label="Hair orders to handle" value={needsAction.length} linkLabel="Hair orders" to="/admin/purchasing" />
        <StatCard icon={PackageMinus} label="Low stock items" value={lowStock.length} linkLabel="Inventory" to="/admin/inventory" />
        <StatCard icon={DollarSign} label="Sales today" value={money(todaySales)} linkLabel="Reports" to="/admin/reports" />
      </div>

      <div className="admin-grid">
        <div className="admin-col">
          <Panel title="Today's appointments" linkLabel="Check out" to="/admin/checkout">
            <DataTable columns={apptColumns} rows={todaysAppointments} emptyMessage="No appointments today." />
          </Panel>
        </div>

        <div className="admin-col">
          <Panel title="Orders to handle" linkLabel="View all" to="/admin/purchasing">
            <DataTable columns={orderColumns} rows={needsAction} emptyMessage="Nothing to order right now." />
          </Panel>
          <Panel title="Low stock" linkLabel="View all" to="/admin/inventory">
            <DataTable columns={stockColumns} rows={lowStock} emptyMessage="Everything is stocked." />
          </Panel>
        </div>

        <div className="admin-col">
          <Panel title="Sales, last 6 business days">
            <BarChart data={weeklySales} />
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