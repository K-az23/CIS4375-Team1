import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import PaymentDetails from '../../components/PaymentDetails';
import { money } from '../../data/sampleData';
import { getAdminCustomers } from '../../services/users';
import { getAdminPayments, paymentStatuses, paymentTypes, paymentDate, paymentError } from '../../services/payments';

const emptyFilters = { status: '', from: '', to: '', user_id: '' };

export default function AdminPayments() {
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCustomers() {
      try {
        const result = await getAdminCustomers({ signal: controller.signal });
        if (!Array.isArray(result)) throw new Error('Customer list unavailable.');
        if (!controller.signal.aborted) setCustomers(result);
      } catch (error) {
        if (!controller.signal.aborted) setCustomerError(paymentError(error));
      }
    }
    loadCustomers();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await getAdminPayments(applied, { signal: controller.signal });
        if (!controller.signal.aborted) setPayments(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(paymentError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [applied, refresh]);

  function apply(event) {
    event.preventDefault();
    setPayments(null); setError(''); setSelected(null);
    setApplied({ ...filters }); setRefresh((value) => value + 1);
  }
  function update(event) { setFilters({ ...filters, [event.target.name]: event.target.value }); }
  function changed(saved) {
    // Remove the row if its new status no longer matches the selected filter.
    setPayments((old) => old?.map((row) => row.payment_id === saved.payment_id ? saved : row)
      .filter((row) => !applied.status || row.status === applied.status));
  }
  const columns = [
    { key: 'payment_id', label: 'Payment', render: (row) => `#${row.payment_id}` },
    { key: 'customer', label: 'Customer', render: (row) => row.customer ? `${row.customer.first_name} ${row.customer.last_name}` : 'Unlinked payment' },
    { key: 'charged_at', label: 'Charged (Central)', render: (row) => paymentDate(row.charged_at) },
    { key: 'payment_type', label: 'Type', render: (row) => paymentTypes[row.payment_type] || row.payment_type },
    { key: 'payment_method', label: 'Method' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={paymentStatuses[row.status] || row.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
    { key: 'details', label: '', render: (row) => <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setSelected(row.payment_id)}>Details</button> },
  ];

  return <>
    <DashboardHeader eyebrow="Billing" title="Payments & refunds" subtitle="Review recorded payments and fully refund eligible card payments." />
    <div className="page-stack">
      <p><Link to="/admin/calendar">Calendar</Link> · <Link to="/admin/orders">Hair orders</Link> · <Link to="/admin/inventory">Inventory</Link></p>
      <p className="field-hint">Appointment attendance is managed in Calendar. Customers pay hairpiece invoices from Orders & invoices.</p>
      <Panel title="Payment filters">
        <form className="form" onSubmit={apply}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
            <div className="form-row">
              <div className="field"><label htmlFor="payment-status">Status</label>
                <select id="payment-status" name="status" value={filters.status} onChange={update}>
                  <option value="">All statuses</option>
                  {Object.entries(paymentStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="payment-customer">Customer</label>
                <select id="payment-customer" name="user_id" value={filters.user_id} onChange={update}>
                  <option value="">All customers</option>
                  {customers.map((customer) => <option key={customer.user_id} value={customer.user_id}>{customer.first_name} {customer.last_name} · {customer.email}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="payment-from">Charged from (Central)</label><input id="payment-from" type="date" name="from" value={filters.from} onChange={update} /></div>
              <div className="field"><label htmlFor="payment-to">Charged through (Central)</label><input id="payment-to" type="date" name="to" value={filters.to} onChange={update} /></div>
            </div>
            <p className="field-hint">Dates filter the charge date. Pending payments without a charge date are excluded when dates are selected.</p>
            <button className="btn btn-dark">Apply / refresh</button>
          </fieldset>
        </form>
        {customerError && <p role="alert">Customer filter unavailable: {customerError}</p>}
      </Panel>
      <Panel title="Payments">
        {!payments && !error && <p role="status">Loading payments…</p>}
        {error && <p role="alert" className="notice notice--warning">{error}</p>}
        {payments && <DataTable columns={columns} rows={payments.map((row) => ({ ...row, id: row.payment_id }))} emptyMessage="No payments match these filters." />}
      </Panel>
      {selected && <PaymentDetails key={selected} id={selected} admin onChanged={changed} onBusy={setBusy} onClose={() => setSelected(null)} />}
    </div>
  </>;
}
