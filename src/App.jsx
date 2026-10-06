import { Routes, Route, Link } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import HairCatalog from './pages/public/HairCatalog';
import Checkout from './pages/public/Checkout';
import Memberships from './pages/public/Memberships';
import Contact from './pages/public/Contact';
import Login from './pages/public/Login';
import SignUp from './pages/public/SignUp';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import BookAppointment from './pages/customer/BookAppointment';
import Appointments from './pages/customer/Appointments';
import Orders from './pages/customer/Orders';
import HairSpecs from './pages/customer/HairSpecs';
import PaymentMethod from './pages/customer/PaymentMethod';
import PaymentHistory from './pages/customer/PaymentHistory';
import CustomerSettings from './pages/customer/CustomerSettings';

import AdminDashboard from './pages/admin/AdminDashboard';
import Calendar from './pages/admin/Calendar';
import AppointmentCheckout from './pages/admin/AppointmentCheckout';
import Customers from './pages/admin/Customers';
import PurchasingTracker from './pages/admin/PurchasingTracker';
import Inventory from './pages/admin/Inventory';
import Catalog from './pages/admin/Catalog';
import Reports from './pages/admin/Reports';
import AdminSettings from './pages/admin/AdminSettings';

function NotFound() {
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: 560 }}>
        <h1>Page not found</h1>
        <p className="muted">That page doesn't exist.</p>
        <div><Link to="/" className="btn btn-dark">Go home</Link></div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/hair-catalog" element={<HairCatalog />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/account" element={<CustomerLayout />}>
          <Route index element={<CustomerDashboard />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="orders" element={<Orders />} />
          <Route path="hair-system" element={<HairSpecs />} />
          <Route path="payment-method" element={<PaymentMethod />} />
          <Route path="payments" element={<PaymentHistory />} />
          <Route path="settings" element={<CustomerSettings />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="checkout" element={<AppointmentCheckout />} />
          <Route path="customers" element={<Customers />} />
          <Route path="purchasing" element={<PurchasingTracker />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </>
  );
}