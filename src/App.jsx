import { Routes, Route } from 'react-router-dom';

import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import HairCatalog from './pages/public/HairCatalog';
import Memberships from './pages/public/Memberships';
import Contact from './pages/public/Contact';
import Login from './pages/public/Login';
import SignUp from './pages/public/SignUp';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import Appointments from './pages/customer/Appointments';
import Orders from './pages/customer/Orders';
import HairSpecs from './pages/customer/HairSpecs';
import PaymentHistory from './pages/customer/PaymentHistory';
import CustomerSettings from './pages/customer/CustomerSettings';

import AdminDashboard from './pages/admin/AdminDashboard';
import Customers from './pages/admin/Customers';
import Calendar from './pages/admin/Calendar';
import Catalog from './pages/admin/Catalog';
import Inventory from './pages/admin/Inventory';
import PurchasingTracker from './pages/admin/PurchasingTracker';
import Reports from './pages/admin/Reports';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/hair-catalog" element={<HairCatalog />} />
        <Route path="/memberships" element={<Memberships />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Route>

      <Route path="/account" element={<CustomerLayout />}>
        <Route index element={<CustomerDashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="orders" element={<Orders />} />
        <Route path="hair-specs" element={<HairSpecs />} />
        <Route path="payments" element={<PaymentHistory />} />
        <Route path="settings" element={<CustomerSettings />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchasing" element={<PurchasingTracker />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}