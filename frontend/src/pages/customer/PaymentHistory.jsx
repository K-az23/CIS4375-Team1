import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import PaymentDetails from '../../components/PaymentDetails';
import { isDemoMode } from '../../context/authUtils.js';
import { customerPayments, money } from '../../data/sampleData';
import { orderTitle, paymentMethodLabel } from '../../api/format';
import { getOrders } from '../../services/orders';
import {
  getPaymentHistory,
  paymentDate,
  paymentStatuses,
  paymentTypes,
  paymentError,
} from '../../services/payments';

function DemoPaymentHistory() {
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'item', label: 'Item' },
    { key: 'method', label: 'Paid with' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => money(row.amount),
    },
  ];

  return (
    <>
      <DashboardHeader
        eyebrow="Payments"
        title="Payment history"
        subtitle="Sample payments shown in demo mode."
      />
      <Panel title="All payments">
        <DataTable
          columns={columns}
          rows={customerPayments.map((row, index) => ({
            ...row,
            id: index,
          }))}
        />
      </Panel>
    </>
  );
}

function LivePaymentHistory() {
  const [payments, setPayments] = useState(null);
  const [orders, setOrders] = useState({});
  const [error, setError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [selected, setSelected] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      // Load both lists together. Payment history can still appear
      // if the separate request for order names fails.
      const results = await Promise.allSettled([
        getPaymentHistory({ signal: controller.signal }),
        getOrders({ signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      if (results[0].status === 'fulfilled') {
        // Main leaves unfinished checkouts out of payment history.
        setPayments(
          results[0].value.filter(
            (payment) =>
              !['pending', 'cancelled'].includes(payment.status)
          )
        );
      } else {
        setError(paymentError(results[0].reason));
      }

      if (results[1].status === 'fulfilled') {
        const orderList = results[1].value;

        setOrders(
          Object.fromEntries(
            orderList.map((order) => [order.order_id, order])
          )
        );
      } else {
        setOrderError(
          'Order names could not be loaded. Order numbers are shown instead.'
        );
      }
    }

    load();
    return () => controller.abort();
  }, [refresh]);

  function reload() {
    setPayments(null);
    setOrders({});
    setError('');
    setOrderError('');
    setSelected(null);
    setRefresh((value) => value + 1);
  }

  function paymentItem(payment) {
    const order = orders[payment.order_id];

    if (order) {
      return `${orderTitle(order)} (order #${order.order_id})`;
    }

    if (payment.order_id) return `Order #${payment.order_id}`;

    return paymentTypes[payment.payment_type] || 'Payment';
  }

  const columns = [
    {
      key: 'payment_id',
      label: 'Payment',
      render: (row) => `#${row.payment_id}`,
    },
    {
      key: 'charged_at',
      label: 'Charged · Central Time',
      render: (row) => paymentDate(row.charged_at),
    },
    {
      key: 'item',
      label: 'Item',
      render: paymentItem,
    },
    {
      key: 'payment_method',
      label: 'Paid with',
      render: (row) => paymentMethodLabel(row.payment_method),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          status={paymentStatuses[row.status] || row.status}
        />
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => money(row.amount),
    },
    {
      key: 'details',
      label: '',
      render: (row) => (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setSelected(row.payment_id)}
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <>
      <DashboardHeader
        eyebrow="Payments"
        title="Payment history"
        subtitle="Payments and refunds recorded for your account."
      />

      <div className="page-stack">
        <Panel title="All payments">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={reload}
          >
            Refresh payments
          </button>

          {!payments && !error && (
            <p role="status">Loading payment history…</p>
          )}

          {error && (
            <p role="alert" className="notice notice--warning">
              {error}
            </p>
          )}

          {orderError && (
            <p role="status" className="field-hint">
              {orderError}
            </p>
          )}

          {payments && (
            <DataTable
              columns={columns}
              rows={payments.map((payment) => ({
                ...payment,
                id: payment.payment_id,
              }))}
              emptyMessage="No payments yet."
            />
          )}
        </Panel>

        {selected && (
          <PaymentDetails
            key={selected}
            id={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  );
}

export default function PaymentHistory() {
  return isDemoMode
    ? <DemoPaymentHistory />
    : <LivePaymentHistory />;
}