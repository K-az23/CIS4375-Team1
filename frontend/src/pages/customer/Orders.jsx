import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { checkoutStateForOrder, formatDate, orderStatusLabel, orderTitle } from '../../api/format';
import { money } from '../../data/sampleData';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  function loadOrders() {
    return api('/api/hairpiece-orders')
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Unpaid orders can be cancelled by the customer; paid ones go through the salon.
  async function cancelOrder(order) {
    setError('');
    try {
      await api(`/api/hairpiece-orders/${order.order_id}/cancel`, { method: 'POST' });
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  function payInvoice(order) {
    navigate('/checkout', { state: checkoutStateForOrder(order) });
  }

  const columns = [
    { key: 'order_id', label: 'Order', nowrap: true, render: (r) => `#${r.order_id}` },
    { key: 'item', label: 'Item', render: (r) => orderTitle(r) },
    { key: 'placed_at', label: 'Date', nowrap: true, render: (r) => formatDate(r.placed_at) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={orderStatusLabel(r.order_status)} /> },
    { key: 'price', label: 'Amount', align: 'right', render: (r) => money(r.price) },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (r) => r.order_status === 'invoice_sent'
        ? (
          <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => cancelOrder(r)}>Cancel</button>
            <button className="btn btn-dark btn-sm" onClick={() => payInvoice(r)}>Pay invoice</button>
          </div>
        )
        : null,
    },
  ];

  return (
    <>
      <DashboardHeader eyebrow="Orders" title="Orders & invoices" subtitle="Systems arrive at the salon about 10 days after payment. We'll text you when yours is received." />
      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
      <Panel title="All orders">
        <DataTable
          columns={columns}
          rows={(orders ?? []).map((o) => ({ ...o, id: o.order_id }))}
          emptyMessage={orders === null && !error ? 'Loading…' : 'No orders yet.'}
        />
      </Panel>
    </>
  );
}
