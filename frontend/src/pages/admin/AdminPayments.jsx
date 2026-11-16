import { useEffect, useState } from 'react';
import { Check, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { money } from '../../data/sampleData';

const statusLabels = {
  pending: 'Pending',
  succeeded: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function chargedAt(value) {
  if (!value) return '—';
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Chicago',
  });
}

export default function AdminPayments() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function loadPayments() {
    setError('');
    try {
      const data = await api('/api/admin/payments');
      setPayments(data.payments ?? []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let active = true;
    api('/api/admin/payments')
      .then((data) => {
        if (active) setPayments(data.payments ?? []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refund(payment) {
    if (!window.confirm(`Refund the full ${money(payment.amount)} for payment #${payment.payment_id}?`)) return;

    setBusyId(payment.payment_id);
    setError('');
    setMessage('');
    try {
      const data = await api(`/api/admin/payments/${payment.payment_id}/refund`, {
        method: 'POST',
      });
      setPayments((current) => current.map((row) => (
        row.payment_id === payment.payment_id ? data.payment : row
      )));
      setMessage(`Payment #${payment.payment_id} refunded.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: 'payment_id', label: 'Payment', render: (row) => `#${row.payment_id}` },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => row.customer
        ? `${row.customer.first_name} ${row.customer.last_name}`
        : 'Unlinked payment',
    },
    { key: 'charged_at', label: 'Charged', render: (row) => chargedAt(row.charged_at) },
    { key: 'payment_type', label: 'Type', render: (row) => row.payment_type?.replaceAll('_', ' ') ?? '—' },
    { key: 'payment_method', label: 'Method', render: (row) => row.payment_method ?? '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={statusLabels[row.status] ?? row.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        row.status === 'succeeded' && row.payment_method === 'card'
          ? <button className="btn btn-outline btn-sm" disabled={busyId === row.payment_id} onClick={() => refund(row)}>{busyId === row.payment_id ? 'Refunding…' : 'Refund'}</button>
          : null
      ),
    },
  ];

  return (
    <>
      <DashboardHeader
        eyebrow="Billing"
        title="Payments & refunds"
        subtitle="Review recorded payments and refund eligible card payments."
      />
      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
        <Panel title="Payments">
          <div style={{ marginBottom: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={loadPayments}>Refresh</button>
          </div>
          <DataTable
            columns={columns}
            rows={(payments ?? []).map((payment) => ({ ...payment, id: payment.payment_id }))}
            emptyMessage={payments === null && !error ? 'Loading…' : 'No payments found.'}
          />
        </Panel>
      </div>
    </>
  );
}
