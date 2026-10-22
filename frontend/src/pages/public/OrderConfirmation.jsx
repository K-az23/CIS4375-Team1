import { Link, useLocation } from 'react-router-dom';
import { Check, CalendarPlus, Package, Truck, Scissors } from 'lucide-react';
import SpecList from '../../components/SpecList';
import { specFields, formatSpec, pricing } from '../../data/hairOptions';
import { business } from '../../data/business';
import { money } from '../../data/sampleData';

const FITTING_AFTER_DAYS = 14; 
const CLOSED_DAYS = [0, 1, 2]; 

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextOpenDay(date) {
  const d = new Date(date);
  while (CLOSED_DAYS.includes(d.getDay())) d.setDate(d.getDate() + 1);
  return d;
}

const longDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function OrderConfirmation() {
  const { state } = useLocation();

  if (!state?.order) {
    return (
      <section className="section">
        <div className="container stack" style={{ maxWidth: 560 }}>
          <h1>No recent order</h1>
          <p className="muted">Your orders and receipts are always available in your account.</p>
          <div className="row">
            <Link to="/account/orders" className="btn btn-dark">View my orders</Link>
            <Link to="/hair-catalog" className="btn btn-outline">Hair Catalog</Link>
          </div>
        </div>
      </section>
    );
  }

  const { order, orderNumber, paidAt } = state;
  const paidDate = new Date(paidAt);
  const arrivalDate = addDays(paidDate, pricing.shippingDays);
  const fittingDate = nextOpenDay(addDays(paidDate, FITTING_AFTER_DAYS));

  const timeline = [
    { icon: Check, title: 'Payment received', when: shortDate(paidDate), done: true },
    { icon: Package, title: 'Ordered from our vendor', when: 'Within 1–2 business days' },
    { icon: Truck, title: 'Arrives at the salon', when: `Around ${shortDate(arrivalDate)}` },
    { icon: Scissors, title: 'Your fitting', when: `From ${shortDate(fittingDate)}` },
  ];

  return (
    <section className="section section--muted">
      <div className="container confirm">
        <header className="confirm__head">
          <span className="confirm__check" aria-hidden="true"><Check size={30} /></span>
          <span className="eyebrow">Order confirmed</span>
          <h1>Thank you, your payment was received</h1>
          <p className="muted">
            Order <strong>{orderNumber}</strong> · A receipt has been sent to your email.
          </p>
        </header>

        <div className="schedule-card">
          <div className="schedule-card__text">
            <span className="eyebrow">Next step</span>
            <h2>Schedule your fitting</h2>
            <p>
              Your hair system needs about {pricing.shippingDays} days to arrive. Book your application
              for <strong>{longDate(fittingDate)}</strong> or later.
            </p>
          </div>
          <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-lg">
            <CalendarPlus size={20} /> Schedule my fitting
          </a>
        </div>

        <div className="confirm__grid">
          <div className="card stack">
            <h3>Order summary</h3>
            <div className="confirm__item">{order.title}</div>
            {order.specs ? (
              <SpecList rows={specFields.map((f) => [f.label, formatSpec(f.key, order.specs[f.key])])} />
            ) : (
              <p className="muted">{order.description}</p>
            )}
            <div className="summary__price">
              <span>Amount paid</span>
              <span className="summary__amount">{money(order.price)}</span>
            </div>
            <p className="field-hint">Hair systems are custom made and can't be returned once ordered.</p>
          </div>

          <div className="card stack">
            <h3>What happens next</h3>
            <ol className="timeline">
              {timeline.map(({ icon: Icon, title, when, done }) => (
                <li key={title} className={`timeline__step ${done ? 'is-done' : ''}`}>
                  <span className="timeline__icon"><Icon size={16} /></span>
                  <div>
                    <div className="timeline__title">{title}</div>
                    <div className="timeline__when">{when}</div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="field-hint">We'll text you when your hair system arrives at the salon.</p>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/account/orders" className="btn btn-outline">View my orders</Link>
          <Link to="/" className="btn btn-outline">Back to home</Link>
        </div>
      </div>
    </section>
  );
}