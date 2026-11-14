import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import PageHero from '../../components/PageHero';
import SpecList from '../../components/SpecList';
import { specFields, formatSpec, pricing } from '../../data/hairOptions';
import { money } from '../../data/sampleData';
import { isDemoMode } from '../../context/authUtils.js';
import { useAuth } from '../../context/useAuth.js';
import { createOrder, getOrder, getOrderCatalog, orderError } from '../../services/orders';
import { getCatalogItem } from '../../services/catalog';
import OrderSummary from '../../components/OrderSummary';

function DemoCheckout() {
  const { state } = useLocation();
  const order = state?.order;
  const [paid, setPaid] = useState(false);

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
    setPaid(true);
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
              {paid ? (
                <p className="notice"><Check size={16} /> Payment received. We'll text you when your system arrives at the salon.</p>
              ) : (
                <>
                  <div id="stripe-checkout" className="embed-placeholder">
                    <Lock size={20} />
                    <strong>Secure Stripe checkout</strong>
                    <span>The card form appears here once the payment server is connected.</span>
                  </div>
                  <button className="btn btn-dark btn-block" onClick={handlePay}>Pay {money(order.price)}</button>
                </>
              )}
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

const apiKeys = {
  hairType: 'hair_type', baseType: 'base_type', skinThickness: 'skin_thickness',
  color: 'color', greyPercent: 'grey_percent', density: 'density', dimensions: 'dimensions',
};

function LiveCheckout() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const savedId = state?.savedOrderId;
  const draft = state?.order;
  const { user, checking } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!draft) return;
    const controller = new AbortController();
    // Recheck the server's prices and product availability before placing an order.
    async function load() {
      setCatalog(null);
      setError('');
      try {
        if (savedId) {
          if (checking || !user) return;
          const order = await getOrder(savedId, { signal: controller.signal });
          if (!controller.signal.aborted) setSaved(order);
          return;
        }
        const data = await getOrderCatalog({ signal: controller.signal });
        if (draft.catalogItemId != null) {
          const item = await getCatalogItem(draft.catalogItemId, { signal: controller.signal });
          if (item.system_type !== 'area') throw new Error('This product requires a consultation.');
        }
        if (!controller.signal.aborted) setCatalog(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(orderError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [draft, reload, savedId, checking, user]);

  const specs = Object.fromEntries(Object.entries(apiKeys).map(([formKey, apiKey]) => [apiKey, draft?.specs?.[formKey]]));
  const valid = catalog && Object.entries(specs).every(([key, value]) => catalog.options[key]?.includes(value));
  const area = catalog?.system_types.find((item) => item.key === 'area');

  async function placeOrder() {
    if (busy || saved || !valid) return;
    setBusy(true);
    setError('');
    try {
      const order = await createOrder(specs, draft.catalogItemId);
      setSaved(order);
      // Keep the saved order ID in this page's history, so refresh only reads it.
      navigate('/checkout', { replace: true, state: { ...state, savedOrderId: order.order_id } });
    } catch (error) {
      setError(orderError(error));
    } finally {
      setBusy(false);
    }
  }

  if (!draft) return <section className="section"><div className="container stack">
    <h1>No order selected</h1><Link className="btn btn-dark" to="/hair-catalog">Go to Hair Catalog</Link>
  </div></section>;

  return <section className="section"><div className="container stack" style={{ maxWidth: 760 }}>
    <h1>Review your order</h1>
    {saved ? <>
      <p role="status" className="notice">Order #{saved.order_id} saved. Its invoice is unpaid; no payment was taken here.</p>
      <OrderSummary order={saved} />
      <Link className="btn btn-dark" to="/account/orders">View my orders</Link>
    </> : <>
      <h3>{draft.title || 'Hair loss area system'}</h3>
      <SpecList rows={specFields.map((field) => [field.label, formatSpec(field.key, draft.specs?.[field.key])])} />
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      {!catalog && !error && <p role="status">{savedId ? 'Loading the saved order…' : 'Checking current price and hair options…'}</p>}
      {catalog && <p>Invoice amount: {money(area.price)}. Delivery to the salon takes about {catalog.shipping_days} days after the order is processed.</p>}
      {catalog && !valid && <p role="alert">Some choices are missing or have changed. Return to the Hair Catalog to choose current options.</p>}
      {checking ? <p role="status">Checking your session…</p> : !user
        ? <Link className="btn btn-dark" to="/login" state={{ from: '/checkout', checkoutState: state }}>Log in to place this order</Link>
        : user.role !== 'customer' ? <p>Use a customer account to place an online order. Admin invoices are created in Hair Orders.</p>
          : <button className="btn btn-dark" type="button" disabled={busy || !valid} onClick={placeOrder}>{busy ? 'Saving…' : 'Place order — invoice unpaid'}</button>}
      {error && <button className="btn btn-outline" type="button" disabled={busy} onClick={() => setReload(reload + 1)}>Recheck catalog</button>}
      <Link to="/hair-catalog">Return to Hair Catalog</Link>
    </>}
  </div></section>;
}

export default function Checkout() {
  return isDemoMode ? <DemoCheckout /> : <LiveCheckout />;
}
