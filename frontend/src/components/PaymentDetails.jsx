import { useEffect, useRef, useState } from 'react';
import Panel from './Panel';
import { money } from '../data/sampleData';
import { getPayment, refundPayment, paymentDate, paymentError, paymentStatuses, paymentTypes } from '../services/payments';

export default function PaymentDetails({ id, admin = false, onClose, onChanged, onBusy }) {
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const saving = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await getPayment(id, { admin, signal: controller.signal });
        if (!controller.signal.aborted) setPayment(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(paymentError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [id, admin, refresh]);

  // A refund needs an explicit confirmation. The backend decides whether it is allowed.
  async function refund() {
    if (saving.current || !window.confirm(`Refund the full ${money(payment.amount)} for payment #${id}?`)) return;
    saving.current = true;
    setBusy(true); onBusy?.(true); setError(''); setMessage('');
    try {
      const saved = await refundPayment(id);
      setPayment(saved);
      onChanged?.(saved);
      setMessage(saved.status === 'refunded' ? 'Full refund confirmed.' : 'Refund requested. Refresh details to check its final status.');
    } catch (error) {
      setError(paymentError(error));
    } finally {
      saving.current = false; setBusy(false); onBusy?.(false);
    }
  }

  return <Panel title={`Payment #${id}`}>
    {!payment && !error && <p role="status">Loading payment…</p>}
    {error && <p role="alert" className="notice notice--warning">{error}</p>}
    {message && <p role="status" className="notice">{message}</p>}
    {payment && <>
      <p><strong>{money(payment.amount)}</strong> · {paymentStatuses[payment.status] || payment.status}</p>
      <p>{paymentTypes[payment.payment_type] || payment.payment_type} · {payment.payment_method === 'card' ? 'Card' : 'Cash'}</p>
      <p>Charged: {paymentDate(payment.charged_at)} (Central Time)</p>
      {payment.order_id && <p>Order #{payment.order_id}</p>}
      {payment.setmore_booking_id && <p>Appointment: {payment.setmore_booking_id}</p>}
      {admin && payment.customer && <p>{payment.customer.first_name} {payment.customer.last_name} · {payment.customer.email}</p>}
      {admin && payment.status === 'succeeded' && payment.payment_method === 'card' && payment.stripe_payment_intent_id &&
        <button className="btn btn-dark" disabled={busy} onClick={refund}>{busy ? 'Requesting refund…' : 'Refund full payment'}</button>}
      {admin && payment.payment_method === 'cash' && <p className="field-hint">Cash refunds are handled by the salon.</p>}
    </>}
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn btn-outline" disabled={busy} onClick={() => { setError(''); setRefresh((value) => value + 1); }}>Refresh details</button>
      <button className="btn btn-outline" disabled={busy} onClick={onClose}>Close details</button>
    </div>
  </Panel>;
}
