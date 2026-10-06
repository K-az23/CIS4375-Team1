import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Receipt, Truck, Package, BookOpen, FileText, Settings, LogOut,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Logo from '../components/Logo';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/admin/checkout', label: 'Checkout & Billing', icon: Receipt },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/purchasing', label: 'Hair Orders', icon: Truck },
  { to: '/admin/inventory', label: 'Inventory', icon: Package },
  { to: '/admin/catalog', label: 'Catalog', icon: BookOpen },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="dash">
      <Sidebar
        top={<Logo />}
        label="Owner tools"
        links={adminLinks}
        bottom={
          <>
            <div className="sidebar__user">
              <span className="sidebar__avatar">A</span>
              <div>
                <div className="sidebar__user-name">Admin</div>
                <div className="sidebar__user-role">Owner</div>
              </div>
            </div>
            <button className="sidebar__logout" onClick={() => navigate('/')}>
              <LogOut size={18} /> Log Out
            </button>
          </>
        }
      />
      <main className="dash__main">
        <Outlet />
      </main>
    </div>
  );
}