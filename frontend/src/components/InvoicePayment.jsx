import { useEffect, useRef, useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { money } from '../data/sampleData';
import { useAuth } from '../context/useAuth.js';
import { getOrder } from '../services/orders';
import { getPaymentHistory, paymentError, startOrderPayment } from '../services/payments';

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = key ? loadStripe(key) : null;

function PaymentForm({ order, onChanged, onClose, onBusy }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paid, setPaid] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Stripe's browser result is not the receipt. Wait for Flask to record the payment.
  async function checkReceipt() {
    const [saved, payments] = await Promise.all([getOrder(order.order_id), getPaymentHistory()]);
    const receipt = payments.find((payment) => payment.order_id === order.order_id && payment.status === 'succeeded');
    if (receipt && saved.order_status !== 'invoice_sent') {
      if (alive.current) {
        setPaid(true); setMessage('Payment confirmed. Your order has been updated.');
        onChanged(saved);
      }
      return true;
    }
    const refunded = payments.find((payment) => payment.order_id === order.order_id && payment.status === 'refunded');
    if (refunded) throw new Error('This invoice has already been refunded. Check Payment history or contact the salon.');
    return false;
  }

  async function submit(event) {
    event.preventDefault();
    if (locked.current || !stripe || !elements) return;
    locked.current = true; setBusy(true); onBusy(true); setError(''); setMessage('');
    try {
      const secret = await startOrderPayment(order.order_id);
      const existing = await stripe.retrievePaymentIntent(secret);
      if (existing.error) throw new Error(existing.error.message);
      let intent = existing.paymentIntent;
      if (!['succeeded', 'processing'].includes(intent.status)) {
        const result = await stripe.confirmCardPayment(secret, {
          payment_method: { card: elements.getElement(CardElement), billing_details: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), email: user?.email,
          } },
        });
        if (result.error) throw new Error(result.error.message);
        intent = result.paymentIntent;
      }
      if (!['succeeded', 'processing'].includes(intent.status)) throw new Error('Payment was not completed. Please try again.');
      setSubmitted(true);
      setMessage('Payment submitted. Waiting for confirmation. Do not pay again.');
      for (let attempt = 0; attempt < 5 && alive.current; attempt += 1) {
        if (await checkReceipt()) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (error) {
      // The connection can fail after Stripe accepted the card. Check first.
      let recorded = false;
      try { recorded = await checkReceipt(); } catch { /* Keep the original error. */ }
      if (!recorded && alive.current) setError(paymentError(error));
    } finally {
      locked.current = false;
      if (alive.current) { setBusy(false); onBusy(false); }
    }
  }

  async function refreshReceipt() {
    if (locked.current) return;
    locked.current = true; setBusy(true); onBusy(true); setError('');
    try {
      if (!await checkReceipt()) setMessage('Confirmation is still pending. Refresh again shortly or check Payment history.');
    } catch (error) {
      setError(paymentError(error));
    } finally {
      locked.current = false; setBusy(false); onBusy(false);
    }
  }

  return <div style={{ marginTop: 16 }}>
    <h3>Pay invoice #{order.order_id}</h3>
    <p>The saved invoice total is {money(order.price)}. Card details go directly to Stripe.</p>
    {error && <p role="alert" className="notice notice--warning">{error}</p>}
    {message && <p role="status" className="notice">{message}</p>}
    {!submitted && <form onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: '1px solid #ddd', padding: 16 }}>
        <legend>Card details</legend>
        <CardElement options={{ disabled: busy, hidePostalCode: false }} />
      </fieldset>
      <button className="btn btn-gold" style={{ marginTop: 12 }} disabled={busy || !stripe || !elements}>
        {busy ? 'Checking payment…' : `Pay ${money(order.price)}`}
      </button>
    </form>}
    {submitted && !paid && <button className="btn btn-outline" disabled={busy} onClick={refreshReceipt}>Refresh confirmation</button>}
    <button className="btn btn-outline" style={{ marginLeft: 8 }} disabled={busy} onClick={onClose}>Close payment form</button>
  </div>;
}

export default function InvoicePayment(props) {
  if (!stripePromise) return <p role="alert" className="notice notice--warning">Card payment is not configured. Contact the salon.</p>;
  return <Elements stripe={stripePromise}><PaymentForm {...props} /></Elements>;
}
