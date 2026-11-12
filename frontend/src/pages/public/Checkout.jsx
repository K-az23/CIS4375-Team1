import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Info, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import PageHero from '../../components/PageHero';
import SpecList from '../../components/SpecList';
import { api } from '../../api/client';
import { useAuth } from '../../context/useAuth.js';
import { specFields, formatSpec, pricing } from '../../data/hairOptions';
import { money } from '../../data/sampleData';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
let stripePromise = null;

// Loads Stripe.js the first time a payment form is shown (not on every page),
// and only once after that.
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

// The order being paid for is kept here so it survives the trip to the
// login page and a page reload.
const STORAGE_KEY = 'checkout';

// Frontend spec keys -> the snake_case keys the backend expects.
const API_SPEC_KEYS = {
  hairType: 'hair_type',
  baseType: 'base_type',
  skinThickness: 'skin_thickness',
  color: 'color',
  greyPercent: 'grey_percent',
  density: 'density',
  dimensions: 'dimensions',
};

function toApiSpecs(specs) {
  return Object.fromEntries(
    Object.entries(API_SPEC_KEYS).map(([key, apiKey]) => [apiKey, specs[key]]),
  );
}

function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function save(order) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Without storage the order just won't survive a reload.
  }
}

function clearSaved() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function PayForm({ order, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError('');
    setPaying(true);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/account/orders` },
    });
    setPaying(false);
    if (stripeError) {
      setError(stripeError.message);
      return;
    }
    onPaid();
  }

  return (
    <form className="stack" onSubmit={handlePay}>
      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
      <PaymentElement />
      <button type="submit" className="btn btn-dark btn-block" disabled={!stripe || paying}>
        {paying ? 'Paying…' : `Pay ${money(order.price)}`}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, checking } = useAuth();

  const [order, setOrder] = useState(() => {
    const incoming = state?.order;
    if (incoming) {
      save(incoming);
      return incoming;
    }
    return loadSaved();
  });
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  // React runs effects twice in development; this stops a second order being created.
  const started = useRef(false);

  const isCustomer = user?.role === 'customer';

  // The browser keeps navigation state across reloads, which would start a second
  // order. Once the order is saved, drop it so a reload uses the saved copy.
  useEffect(() => {
    if (state?.order) navigate('/checkout', { replace: true, state: null });
  }, [state, navigate]);

  useEffect(() => {
    if (!order || !isCustomer || paid || started.current) return;
    started.current = true;

    async function start() {
      try {
        let orderId = order.orderId;
        if (!orderId) {
          const created = await api('/api/hairpiece-orders', {
            method: 'POST',
            body: { specs: toApiSpecs(order.specs) },
          });
          orderId = created.order.order_id;
          const withId = { ...order, orderId };
          save(withId);
          setOrder(withId);
        }
        // Calling this again for the same unpaid order returns the same payment.
        const intent = await api('/api/payments/create-intent', {
          method: 'POST',
          body: { order_id: orderId },
        });
        setClientSecret(intent.client_secret);
      } catch (err) {
        setError(err.message);
      }
    }
    start();
  }, [order, isCustomer, paid]);

  function handlePaid() {
    clearSaved();
    setPaid(true);
  }

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

  let payment;
  if (paid) {
    payment = (
      <>
        <p className="notice"><Check size={16} /> Payment received. We'll text you when your system arrives at the salon.</p>
        <div><Link to="/account/orders" className="btn btn-dark">View my orders</Link></div>
      </>
    );
  } else if (checking) {
    payment = <p className="muted">Checking your account…</p>;
  } else if (!user) {
    payment = (
      <>
        <p className="muted">Log in or create an account to pay. Your selections are saved.</p>
        <button className="btn btn-dark btn-block" onClick={() => navigate('/login', { state: { from: '/checkout' } })}>
          Log in to pay
        </button>
      </>
    );
  } else if (!isCustomer) {
    payment = <p className="notice notice--warning"><Info size={16} /> Log in with a customer account to place an order.</p>;
  } else if (!publishableKey) {
    payment = <p className="notice notice--warning"><Info size={16} /> Payments aren't set up: VITE_STRIPE_PUBLISHABLE_KEY is missing in frontend/.env.</p>;
  } else if (error) {
    payment = <p className="notice notice--warning"><Info size={16} /> {error}</p>;
  } else if (!clientSecret) {
    payment = (
      <div className="embed-placeholder">
        <Lock size={20} />
        <strong>Secure Stripe checkout</strong>
        <span>Preparing your payment…</span>
      </div>
    );
  } else {
    payment = (
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <PayForm order={order} onPaid={handlePaid} />
      </Elements>
    );
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
              {payment}
            </div>
          </div>

          <aside className="card summary">
            <h3>Order summary</h3>
            <SpecList rows={[
              [order.title, money(order.price)],
              ['Delivery to salon', `About ${order.shippingDays ?? pricing.shippingDays} days`],
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