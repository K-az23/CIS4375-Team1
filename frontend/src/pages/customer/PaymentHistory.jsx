import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { customerPayments, money } from '../../data/sampleData';
import { getPaymentHistory } from '../../services/payments';

const paymentTypes = {
  service: 'Salon service',
  deposit: 'Deposit',
  cancellation_fee: 'Cancellation fee',
  no_show_fee: 'No-show fee',
  hairpiece_order: 'Hairpiece order',
};

const paymentMethods = { card: 'Card', cash: 'Cash' };

const paymentStatuses = {
  pending: 'Pending',
  succeeded: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function formatChargedAt(value) {
  if (!value) return '—';

  // The API currently sends UTC timestamps without a timezone suffix.
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

function toRow(payment) {
  return {
    id: payment.payment_id,
    date: formatChargedAt(payment.charged_at),
    item: paymentTypes[payment.payment_type] ?? 'Payment',
    method: paymentMethods[payment.payment_method] ?? '—',
    status: paymentStatuses[payment.status] ?? 'Unknown',
    amount: payment.amount,
  };
}

const columns = [
  { key: 'date', label: 'Date', nowrap: true },
  { key: 'item', label: isDemoMode ? 'Service / product' : 'Payment type' },
  { key: 'method', label: 'Paid with', nowrap: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
];

export default function PaymentHistory() {
  const [rows, setRows] = useState(isDemoMode ? customerPayments : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadPayments() {
      try {
        const payments = await getPaymentHistory({ signal: controller.signal });

        if (!Array.isArray(payments)) {
          throw new Error('The server returned an invalid payments list.');
        }

        if (!controller.signal.aborted) setRows(payments.map(toRow));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadPayments();
    return () => controller.abort();
  }, []);

  return (
    <>
      <DashboardHeader eyebrow="Payments" title="Payment history" subtitle="Payments recorded for your account." />
      <Panel title="All payments">
        {!rows && !error && <p role="status">Loading payment history…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load payment history. {error}</p>}
        {rows && <DataTable columns={columns} rows={rows} emptyMessage="No payments yet." />}
      </Panel>
    </>
  );
}