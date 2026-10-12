import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, CalendarPlus, CalendarCheck, ShoppingCart, Package, Info, Scissors } from 'lucide-react';
import Modal from '../../components/Modal';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SpecList from '../../components/SpecList';
import { useAuth } from '../../context/useAuth.js';
import { business } from '../../data/business';
import { specFields, formatSpec } from '../../data/hairOptions';
import { currentCustomer, nextAppointment, customerOrders, money } from '../../data/sampleData';

const actions = [
  { to: '/account/book', icon: CalendarPlus, title: 'Book an appointment', text: 'Choose a service, day and time' },
  { to: '/account/hair-system', icon: ShoppingCart, title: 'Re-order my hair system', text: 'Uses your saved specifications' },
  { to: '/account/orders', icon: Package, title: 'Orders & billing', text: 'Track orders and pay invoices' },
];

const orderColumns = [
  { key: 'product', label: 'Item' },
  { key: 'date', label: 'Date', nowrap: true },
  { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
];

const keySpecs = ['color', 'greyPercent', 'density', 'dimensions'];

export default function CustomerDashboard() {
  const { state } = useLocation();
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(Boolean(state?.newAccount));

  const firstName = user?.firstName || currentCustomer.firstName;
  const balanceDue = customerOrders.find((o) => o.status === 'Invoice due');
  const system = currentCustomer.savedSystem;

  return (
    <div className="overview">
      {showWelcome && (
        <Modal title="Welcome to The Executive Parlor" onClose={() => setShowWelcome(false)}>
          <p className="muted">
            New clients begin with a complimentary consultation. We'll match your color, density and
            size, then save your custom system to your account for easy re-ordering.
          </p>
          <div className="modal__actions">
            <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">Book a consultation</a>
            <button className="btn btn-outline" onClick={() => setShowWelcome(false)}>Maybe later</button>
          </div>
        </Modal>
      )}

      <header className="overview__header">
        <span className="eyebrow">My account</span>
        <h1>Welcome back, {firstName}</h1>
      </header>

      {balanceDue && (
        <div className="balance-bar" role="status">
          <Info size={20} />
          <div className="balance-bar__text">
            <strong>Balance due: {money(balanceDue.amount)}</strong>
            <span>{balanceDue.product}</span>
          </div>
          <Link to="/account/orders" className="btn btn-dark">Pay now</Link>
        </div>
      )}

      <div className="overview__actions">
        {actions.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="action-tile">
            <span className="action-tile__icon"><Icon size={22} /></span>
            <span className="action-tile__body">
              <span className="action-tile__title">{title}</span>
              <span className="action-tile__text">{text}</span>
            </span>
            <ChevronRight size={22} className="action-tile__arrow" />
          </Link>
        ))}
      </div>

      <div className="two-col">
        <section className="card overview-card">
          <div className="overview-card__head">
            <span className="icon-circle"><CalendarCheck size={18} /></span>
            <span className="overview-card__label">Next appointment</span>
          </div>
          <div className="overview-card__value">{nextAppointment.date}</div>
          <SpecList rows={[
            ['Time', nextAppointment.time],
            ['Service', nextAppointment.service],
            ['Location', 'Reserve Salon and Spa, Rm 53'],
          ]} />
          <div className="overview-card__footer">
            <Link to="/account/appointments" className="btn btn-outline">View appointments</Link>
          </div>
        </section>

        <section className="card overview-card">
          <div className="overview-card__head">
            <span className="icon-circle"><Scissors size={18} /></span>
            <span className="overview-card__label">My hair system</span>
          </div>
          <SpecList rows={specFields.filter((f) => keySpecs.includes(f.key)).map((f) => [f.label, formatSpec(f.key, system.specs[f.key])])} />
          <div className="overview-card__footer">
            <Link to="/account/hair-system" className="btn btn-outline">View full details</Link>
          </div>
        </section>
      </div>

      <Panel title="Recent orders" linkLabel="View all" to="/account/orders">
        <DataTable columns={orderColumns} rows={customerOrders} />
      </Panel>

      <p className="overview__help">
        Questions about an order or appointment? <Link to="/contact">Contact us</Link>
      </p>
    </div>
  );
}