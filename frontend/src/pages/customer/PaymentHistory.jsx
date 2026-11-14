import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { customerPayments, money } from '../../data/sampleData';
import { getPaymentHistory, paymentDate, paymentStatuses as liveStatuses, paymentTypes as liveTypes, paymentError } from '../../services/payments';
import PaymentDetails from '../../components/PaymentDetails';

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

function DemoPaymentHistory() {
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

function LivePaymentHistory() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await getPaymentHistory({ signal: controller.signal });
        if (!controller.signal.aborted) setPayments(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(paymentError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [refresh]);
  const liveColumns = [
    { key: 'payment_id', label: 'Payment', render: (row) => `#${row.payment_id}` },
    { key: 'charged_at', label: 'Charged (Central)', render: (row) => paymentDate(row.charged_at) },
    { key: 'payment_type', label: 'Type', render: (row) => liveTypes[row.payment_type] || row.payment_type },
    { key: 'payment_method', label: 'Paid with' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={liveStatuses[row.status] || row.status} /> },
    { key: 'amount', label: 'Amount', render: (row) => money(row.amount), align: 'right' },
    { key: 'details', label: '', render: (row) => <button className="btn btn-outline btn-sm" onClick={() => setSelected(row.payment_id)}>Details</button> },
  ];
  return <>
    <DashboardHeader eyebrow="Payments" title="Payment history" subtitle="Payments and refunds recorded for your account." />
    <div className="page-stack">
      <Panel title="All payments">
        <button className="btn btn-outline btn-sm" onClick={() => { setPayments(null); setError(''); setSelected(null); setRefresh((value) => value + 1); }}>Refresh payments</button>
        {!payments && !error && <p role="status">Loading payment history…</p>}
        {error && <p role="alert" className="notice notice--warning">{error}</p>}
        {payments && <DataTable columns={liveColumns} rows={payments.map((row) => ({ ...row, id: row.payment_id }))} emptyMessage="No payments yet." />}
      </Panel>
      {selected && <PaymentDetails key={selected} id={selected} onClose={() => setSelected(null)} />}
    </div>
  </>;
}

export default function PaymentHistory() {
  return isDemoMode ? <DemoPaymentHistory /> : <LivePaymentHistory />;
}
