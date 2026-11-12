import { useEffect, useState } from 'react';
import { Info, Search } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../api/client';
import { customerName, formatDate } from '../../api/format';
import { money } from '../../data/sampleData';

const NO_SHOW_LIMIT = 3;

const columns = [
  { key: 'name', label: 'Name', nowrap: true, render: (r) => customerName(r) },
  { key: 'email', label: 'Email' },
  // last_visit comes from completed appointments (Kevin's appointments work); "—" until then.
  { key: 'lastVisit', label: 'Last visit', nowrap: true, render: (r) => formatDate(r.last_visit) },
  // Card on file is turned off, so there's no card to show.
  // { key: 'card', label: 'Card', render: (r) => <StatusBadge status={r.card ? 'On file' : 'No card'} /> },
  { key: 'noShows', label: 'No-shows', align: 'right', render: (r) => r.no_show_count ?? 0 },
  { key: 'totalSpent', label: 'Total spent', align: 'right', render: (r) => money(r.total_spent) },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={(r.no_show_count ?? 0) >= NO_SHOW_LIMIT ? 'Restricted' : 'Active'} /> },
];

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/admin/users'), api('/api/admin/reports/customer-spending')])
      .then(([userData, spending]) => {
        const spent = Object.fromEntries(spending.customers.map((c) => [c.user_id, c.total_spent]));
        setCustomers(userData.users.map((u) => ({ ...u, id: u.user_id, total_spent: spent[u.user_id] ?? 0 })));
      })
      .catch((err) => setError(err.message));
  }, []);

  const filtered = (customers ?? []).filter((c) => `${customerName(c)} ${c.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <DashboardHeader eyebrow="Clients" title="Customers" subtitle="Profiles, spending and no-show history." showIcons />
      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        </div>
      </div>
      <Panel title={`${filtered.length} customers`}>
        <DataTable
          columns={columns}
          rows={filtered}
          emptyMessage={customers === null && !error ? 'Loading…' : 'No customers match that search.'}
        />
      </Panel>
    </>
  );
}
