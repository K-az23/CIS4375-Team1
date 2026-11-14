import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Panel from './Panel';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import { money } from '../data/sampleData';
import { getOrders, orderDate, orderStatuses } from '../services/orders';

export default function CustomerBillingSummary({ recent = false }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await getOrders({ signal: controller.signal });
        if (!controller.signal.aborted) setOrders(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }
    load();
    return () => controller.abort();
  }, []);
  if (error) return <p role="alert">Couldn’t load billing summary. <Link to="/account/orders">Open orders to retry</Link>.</p>;
  if (!orders) return <p role="status">Loading {recent ? 'orders' : 'balance'}…</p>;
  if (!recent) {
    const unpaid = orders.filter((order) => order.order_status === 'invoice_sent');
    const total = unpaid.reduce((sum, order) => sum + Number(order.price || 0), 0);
    return <div className="balance-bar">
      <div className="balance-bar__text"><strong>Invoice balance due: {money(total)}</strong>
        <span>{unpaid.length ? `${unpaid.length} unpaid invoice(s)` : 'No unpaid hairpiece invoices.'}</span></div>
      <Link className="btn btn-dark" to="/account/orders">View invoices</Link>
    </div>;
  }
  const columns = [
    { key: 'order_id', label: 'Order', render: (row) => `#${row.order_id}` },
    { key: 'placed_at', label: 'Date', render: (row) => orderDate(row.placed_at) },
    { key: 'order_status', label: 'Status', render: (row) => <StatusBadge status={orderStatuses[row.order_status] || row.order_status} /> },
    { key: 'price', label: 'Amount', align: 'right', render: (row) => money(row.price) },
  ];
  return <Panel title="Recent orders" linkLabel="View all" to="/account/orders">
    <DataTable columns={columns} rows={orders.slice(0, 5).map((row) => ({ ...row, id: row.order_id }))} emptyMessage="No orders yet." />
  </Panel>;
}
