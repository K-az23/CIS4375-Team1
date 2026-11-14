import { lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
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
import ResetPassword from './pages/public/ResetPassword';
import SignUp from './pages/public/SignUp';

const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const BookAppointment = lazy(() => import('./pages/customer/BookAppointment'));
const Appointments = lazy(() => import('./pages/customer/Appointments'));
const Orders = lazy(() => import('./pages/customer/Orders'));
const HairSpecs = lazy(() => import('./pages/customer/HairSpecs'));

// Main hides Card on File. Keep its source files for later use.
const PaymentHistory = lazy(() => import('./pages/customer/PaymentHistory'));
const CustomerSettings = lazy(() => import('./pages/customer/CustomerSettings'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Calendar = lazy(() => import('./pages/admin/Calendar'));
const AppointmentCheckout = lazy(() => import('./pages/admin/AppointmentCheckout'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const PurchasingTracker = lazy(() => import('./pages/admin/PurchasingTracker'));
const Inventory = lazy(() => import('./pages/admin/Inventory'));
const Catalog = lazy(() => import('./pages/admin/Catalog'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

function NotFound() {
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: 560 }}>
        <h1>Page not found</h1>
        <p className="muted">That page doesn't exist.</p>
        <div>
          <Link to="/" className="btn btn-dark">
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<Loading fullPage />}>
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Customer pages require a customer login. */}
          <Route
            path="/account"
            element={
              <ProtectedRoute allow={['customer']}>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CustomerDashboard />} />
            <Route path="book" element={<BookAppointment />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="orders" element={<Orders />} />
            <Route path="hair-system" element={<HairSpecs />} />

            {/* Send old saved-card links back to the account page. */}
            <Route
              path="payment-method"
              element={<Navigate to="/account" replace />}
            />

            <Route path="payments" element={<PaymentHistory />} />
            <Route path="settings" element={<CustomerSettings />} />
          </Route>

          {/* Admin pages require an owner/admin login. */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={['owner']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="checkout" element={<AppointmentCheckout />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="purchasing" element={<PurchasingTracker />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}