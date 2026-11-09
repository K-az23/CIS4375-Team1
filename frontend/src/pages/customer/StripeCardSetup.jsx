import { useEffect, useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { startCardSetup } from '../../services/payments';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
let stripePromise;

function CardForm({ onCancel, onConfirmed }) {
  const stripe = useStripe();
  const elements = useElements();
  const [complete, setComplete] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();

    const card = elements?.getElement(CardElement);
    if (!stripe || !card || !complete || !agreed || saving) return;

    setError('');
    setSaving(true);

    try {
      const clientSecret = await startCardSetup();
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
        return_url: new URL('/account/payment-method', window.location.origin).href,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Stripe could not confirm this card.');
      }

      const status = result.setupIntent?.status;
      if (status !== 'succeeded' && status !== 'processing') {
        throw new Error('Card setup was incomplete. Please try again.');
      }

      onConfirmed();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      <div className="field">
        <span>Card details</span>
        <div className="embed-placeholder" style={{ padding: 16, justifyItems: 'stretch', gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <CardElement
            options={{ disabled: saving, disableLink: true }}
            onChange={(event) => {
              setComplete(event.complete);
              setError(event.error?.message ?? '');
            }}
          />
        </div>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={agreed} disabled={saving} onChange={(event) => setAgreed(event.target.checked)} />
        I agree to save this card for appointment charges and the $50 no-show fee for missed hair replacement appointments.
      </label>
      <div className="row">
        <button type="submit" className="btn btn-dark" disabled={!stripe || !complete || !agreed || saving}>
          {saving ? 'Saving…' : 'Save card'}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

export default function StripeCardSetup({ onCancel, onConfirmed }) {
  const [stripe, setStripe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!publishableKey) return;

    let active = true;
    stripePromise ??= loadStripe(publishableKey);
    stripePromise
      .then((client) => {
        if (!client) throw new Error('Stripe did not load.');
        if (active) setStripe(client);
      })
      .catch(() => {
        stripePromise = undefined;
        if (active) setError('Couldn’t load Stripe. Close the form and try again.');
      });

    return () => { active = false; };
  }, []);

  if (stripe) {
    return (
      <Elements stripe={stripe}>
        <CardForm onCancel={onCancel} onConfirmed={onConfirmed} />
      </Elements>
    );
  }

  const problem = publishableKey ? error : 'Card setup is unavailable until Stripe is configured.';
  return (
    <>
      {problem
        ? <p role="alert" className="notice notice--warning">{problem}</p>
        : <p role="status">Loading secure card form…</p>}
      <div><button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button></div>
    </>
  );
}
