import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { customerOrders, money } from '../../data/sampleData';

export default function Orders() {
  const navigate = useNavigate();

  function payInvoice(order) {
    navigate('/checkout', {
      state: { order: { title: order.product, description: `Invoice ${order.id} from The Executive Parlor.`, price: order.amount } },
    });
  }

  const columns = [
    { key: 'id', label: 'Order', nowrap: true },
    { key: 'product', label: 'Item' },
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (r) => r.status === 'Invoice due'
        ? <button className="btn btn-dark btn-sm" onClick={() => payInvoice(r)}>Pay invoice</button>
        : null,
    },
  ];

  return (
    <>
      <DashboardHeader eyebrow="Orders" title="Orders & invoices" subtitle="Systems arrive at the salon about 10 days after payment. We'll text you when yours is received." />
      <Panel title="All orders">
        <DataTable columns={columns} rows={customerOrders} emptyMessage="No orders yet." />
      </Panel>
    </>
  );
}