import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { customerPayments, money } from '../../data/sampleData';

const columns = [
  { key: 'date', label: 'Date', nowrap: true },
  { key: 'item', label: 'Service / product' },
  { key: 'method', label: 'Paid with', nowrap: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
];

export default function PaymentHistory() {
  return (
    <>
      <DashboardHeader eyebrow="Payments" title="Payment history" subtitle="Online orders and in-salon services." />
      <Panel title="All payments">
        <DataTable columns={columns} rows={customerPayments} />
      </Panel>
    </>
  );
}