import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import PageHero from '../../components/PageHero';
import SpecList from '../../components/SpecList';
import { specFields, formatSpec, pricing } from '../../data/hairOptions';
import { money } from '../../data/sampleData';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;

  if (!order) {
    return (
      <section className="section">
        <div className="container stack" style={{ maxWidth: 560 }}>
          <h1>Nothing to pay for yet</h1>
          <p className="muted">Start by choosing your hair system in the Hair Catalog.</p>
          <div><Link to="/hair-catalog" className="btn btn-dark">Go to Hair Catalog</Link></div>
        </div>
      </section>
    );
  }

  function handlePay() {
    const now = new Date();
    navigate('/order-confirmed', {
      replace: true,
      state: { order, orderNumber: `EP-${String(now.getTime()).slice(-6)}`, paidAt: now.toISOString() },
    });
  }

  return (
    <>
      <PageHero eyebrow="Checkout" title="Review & pay" subtitle="Check your order, then pay securely." />

      <section className="section">
        <div className="container config">
          <div className="stack-lg">
            <div className="card stack">
              <h3>{order.title}</h3>
              {order.specs ? (
                <SpecList rows={specFields.map((f) => [f.label, formatSpec(f.key, order.specs[f.key])])} />
              ) : (
                <p className="muted">{order.description}</p>
              )}
            </div>

            <div className="card stack">
              <h3>Payment</h3>
              <div id="stripe-checkout" className="embed-placeholder">
                <Lock size={20} />
                <strong>Secure Stripe checkout</strong>
                <span>The card form appears here once the payment server is connected.</span>
              </div>
              <button className="btn btn-dark btn-block" onClick={handlePay}>Pay {money(order.price)}</button>
            </div>
          </div>

          <aside className="card summary">
            <h3>Order summary</h3>
            <SpecList rows={[
              [order.title, money(order.price)],
              ['Delivery to salon', `About ${pricing.shippingDays} days`],
            ]} />
            <div className="summary__price">
              <span>Total</span>
              <span className="summary__amount">{money(order.price)}</span>
            </div>
            <p className="field-hint">Hair systems are custom made and can't be returned once ordered.</p>
          </aside>
        </div>
      </section>
    </>
  );
}