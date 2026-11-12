import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { formatDate, orderTitle, paymentMethodLabel, paymentStatusLabel } from '../../api/format';
import { money } from '../../data/sampleData';

export default function PaymentHistory() {
  const [payments, setPayments] = useState(null);
  const [orders, setOrders] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/payments'), api('/api/hairpiece-orders')])
      .then(([paymentData, orderData]) => {
        setOrders(Object.fromEntries(orderData.orders.map((o) => [o.order_id, o])));
        // Unfinished checkouts (pending/cancelled) never took money, so they're left out.
        setPayments(paymentData.payments.filter((p) => !['pending', 'cancelled'].includes(p.status)));
      })
      .catch((err) => setError(err.message));
  }, []);

  function itemFor(payment) {
    const order = orders[payment.order_id];
    if (order) return `${orderTitle(order)} (order #${order.order_id})`;
    return payment.order_id ? `Order #${payment.order_id}` : 'Payment';
  }

  const columns = [
    { key: 'charged_at', label: 'Date', nowrap: true, render: (r) => formatDate(r.charged_at) },
    { key: 'item', label: 'Item', render: itemFor },
    { key: 'method', label: 'Paid with', nowrap: true, render: (r) => paymentMethodLabel(r.payment_method) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={paymentStatusLabel(r.status)} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
  ];

  return (
    <>
      <DashboardHeader eyebrow="Payments" title="Payment history" subtitle="Your online hair system payments." />
      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
      <Panel title="All payments">
        <DataTable
          columns={columns}
          rows={(payments ?? []).map((p) => ({ ...p, id: p.payment_id }))}
          emptyMessage={payments === null && !error ? 'Loading…' : 'No payments yet.'}
        />
      </Panel>
    </>
  );
}
