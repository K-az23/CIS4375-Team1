import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { customerOrders, money } from '../../data/sampleData';
import { getOrders } from '../../services/orders';

const orderStatuses = {
  pending: 'Pending',
  ordered: 'Ordered',
  received: 'Received',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function formatPlacedAt(value) {
  if (!value) return '—';

  // The current order model serializes UTC timestamps without a timezone suffix.
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

function toRow(order) {
  const type = order.order_type?.trim().replace(/_/g, ' ');
  return {
    id: `#${order.order_id}`,
    product: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Hairpiece order',
    date: formatPlacedAt(order.placed_at),
    status: orderStatuses[order.order_status] ?? 'Unknown',
    amount: order.price,
  };
}

export default function Orders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(isDemoMode ? customerOrders : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadOrders() {
      try {
        const orders = await getOrders({ signal: controller.signal });
        if (!Array.isArray(orders)) {
          throw new Error('The server returned an invalid orders list.');
        }

        if (!controller.signal.aborted) setRows(orders.map(toRow));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadOrders();
    return () => controller.abort();
  }, []);

  function payInvoice(order) {
    navigate('/checkout', {
      state: { order: { title: order.product, description: `Invoice ${order.id} from The Executive Parlor.`, price: order.amount } },
    });
  }

  const columns = [
    { key: 'id', label: 'Order', nowrap: true },
    { key: 'product', label: 'Item' },
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
  ];

  if (isDemoMode) {
    columns.push({
      key: 'action',
      label: '',
      align: 'right',
      render: (row) => row.status === 'Invoice due'
        ? <button className="btn btn-dark btn-sm" onClick={() => payInvoice(row)}>Pay invoice</button>
        : null,
    });
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Orders"
        title={isDemoMode ? 'Orders & invoices' : 'Orders'}
        subtitle={isDemoMode
          ? "Systems arrive at the salon about 10 days after payment. We'll text you when yours is received."
          : 'View your hairpiece orders and their current status.'}
      />
      <Panel title="All orders">
        {!rows && !error && <p role="status">Loading orders…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load orders. {error}</p>}
        {rows && <DataTable columns={columns} rows={rows} emptyMessage="No orders yet." />}
      </Panel>
    </>
  );
}
