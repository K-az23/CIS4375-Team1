import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CalendarPlus, CalendarCheck, ShoppingCart, Package, Scissors, CreditCard, Info } from 'lucide-react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SpecList from '../../components/SpecList';
import Modal from '../../components/Modal';
import { business } from '../../data/business';
import { specFields, formatSpec } from '../../data/hairOptions';
import { currentCustomer, nextAppointment, customerOrders, money } from '../../data/sampleData';

const orderColumns = [
  { key: 'id', label: 'Order', nowrap: true },
  { key: 'product', label: 'Item' },
  { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'date', label: 'Date', nowrap: true },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
];

export default function CustomerDashboard() {
  const { state } = useLocation();
  const [showWelcome, setShowWelcome] = useState(Boolean(state?.newAccount));
  const c = currentCustomer;
  const invoiceDue = customerOrders.find((o) => o.status === 'Invoice due');
  const keySpecs = ['color', 'greyPercent', 'density', 'dimensions'];

  return (
    <>
      {showWelcome && (
        <Modal title="Welcome to The Executive Parlor" onClose={() => setShowWelcome(false)}>
          <p className="muted">
            New clients start with a free consultation. We'll match your color, density and size,
            then save your custom system to your account for easy re-ordering.
          </p>
          <div className="modal__actions">
            <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">Book a consultation</a>
            <button className="btn btn-outline" onClick={() => setShowWelcome(false)}>Maybe later</button>
          </div>
        </Modal>
      )}

      <div className="dash-header">
        <div className="welcome">
          <span className="welcome__avatar">{c.firstName[0]}{c.lastName[0]}</span>
          <div>
            <h1 className="dash-header__title">Welcome back, {c.firstName}</h1>
            <p className="dash-header__subtitle">Your appointments, orders and hair system in one place.</p>
          </div>
        </div>
      </div>

      {invoiceDue && (
        <div className="notice notice--warning" style={{ marginBottom: 20, alignItems: 'center' }}>
          <Info size={16} />
          <span style={{ flex: 1 }}>You have an invoice of <strong>{money(invoiceDue.amount)}</strong> for your {invoiceDue.product.toLowerCase()}.</span>
          <Link to="/account/orders" className="link-gold">Pay invoice <ArrowRight size={15} /></Link>
        </div>
      )}

      <div className="quick-actions">
        <Link to="/account/book" className="quick-action quick-action--dark">
          <CalendarPlus size={18} /> Book appointment <ArrowRight size={16} className="quick-action__arrow" />
        </Link>
        <Link to="/account/hair-system" className="quick-action">
          <ShoppingCart size={18} /> Re-order hair <ArrowRight size={16} className="quick-action__arrow" />
        </Link>
        <Link to="/account/orders" className="quick-action">
          <Package size={18} /> Orders <ArrowRight size={16} className="quick-action__arrow" />
        </Link>
        <Link to="/account/payment-method" className="quick-action">
          <CreditCard size={18} /> Card on file <ArrowRight size={16} className="quick-action__arrow" />
        </Link>
      </div>

      <div className="cust-grid">
        <div className="cust-main">
          <div className="two-col">
            <div className="card stat-card">
              <div className="stat-card__top">
                <div>
                  <div className="stat-card__label">Next appointment</div>
                  <div className="big-line">{nextAppointment.date}</div>
                  <div className="stat-card__note">{nextAppointment.time} · {nextAppointment.service}</div>
                </div>
                <span className="icon-circle"><CalendarCheck size={18} /></span>
              </div>
              <div className="stat-card__link">
                <Link to="/account/appointments" className="link-gold">My appointments <ArrowRight size={15} /></Link>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-card__top">
                <div>
                  <div className="stat-card__label">Card on file</div>
                  <div className="big-line">{c.cardOnFile ? `${c.cardOnFile.brand} •••• ${c.cardOnFile.last4}` : 'No card yet'}</div>
                  <div className="stat-card__note">Required to book appointments</div>
                </div>
                <span className="icon-circle"><CreditCard size={18} /></span>
              </div>
              <div className="stat-card__link">
                <Link to="/account/payment-method" className="link-gold">Manage card <ArrowRight size={15} /></Link>
              </div>
            </div>
          </div>

          <Panel title="Recent orders" linkLabel="View all" to="/account/orders">
            <DataTable columns={orderColumns} rows={customerOrders} />
          </Panel>
        </div>

        <aside className="cust-aside">
          <Panel title="My hair system" linkLabel="Details" to="/account/hair-system">
            <SpecList rows={specFields.filter((f) => keySpecs.includes(f.key)).map((f) => [f.label, formatSpec(f.key, c.savedSystem.specs[f.key])])} />
          </Panel>

          <div className="promo">
            <Scissors size={20} color="var(--gold)" />
            <h3>Time for a new system?</h3>
            <p>Re-order your saved custom system in a few clicks.</p>
            <div><Link to="/account/hair-system" className="btn btn-gold btn-sm">Re-order now</Link></div>
          </div>
        </aside>
      </div>
    </>
  );
}