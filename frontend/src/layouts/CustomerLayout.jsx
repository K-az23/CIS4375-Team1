import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarPlus, CalendarCheck, Package, Scissors, CreditCard, Receipt, Settings, LogOut,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/useAuth.js';

const customerLinks = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/book', label: 'Book Appointment', icon: CalendarPlus },
  { to: '/account/appointments', label: 'My Appointments', icon: CalendarCheck },
  { to: '/account/orders', label: 'Orders & Billing', icon: Package },
  { to: '/account/hair-system', label: 'My Hair System', icon: Scissors },
  { to: '/account/payment-method', label: 'Card on File', icon: CreditCard },
  { to: '/account/payments', label: 'Payment History', icon: Receipt },
  { to: '/account/settings', label: 'Settings', icon: Settings },
];

export default function CustomerLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    navigate('/');
    logout();
  }

  return (
    <>
      <Navbar variant="account" />
      <div className="dash dash--with-topnav dash--customer">
        <Sidebar
          label="My account"
          links={customerLinks}
          bottom={
            <button className="sidebar__logout" onClick={handleLogout}>
              <LogOut size={18} /> Log Out
            </button>
          }
        />
        <main className="dash__main">
          <Outlet />
        </main>
      </div>
    </>
  );
}