import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { customers, money } from '../../data/sampleData';
import { getAdminCustomers } from '../../services/users';

const NO_SHOW_LIMIT = 3;

function customerStatus(row) {
  if (row.isActive === false) return 'Inactive';
  return row.noShows >= NO_SHOW_LIMIT ? 'Restricted' : 'Active';
}

const columns = [
  { key: 'name', label: 'Name', nowrap: true },
  { key: 'email', label: 'Email' },
  ...(isDemoMode ? [
    { key: 'lastVisit', label: 'Last visit', nowrap: true },
    { key: 'card', label: 'Card', render: (row) => <StatusBadge status={row.card ? 'On file' : 'No card'} /> },
  ] : []),
  { key: 'noShows', label: 'No-shows', align: 'right' },
  ...(isDemoMode ? [
    { key: 'totalSpent', label: 'Total spent', align: 'right', render: (row) => money(row.totalSpent) },
  ] : []),
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={customerStatus(row)} /> },
];

function toRow(user) {
  return {
    id: user.user_id,
    name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    email: user.email,
    noShows: user.no_show_count ?? 0,
    isActive: user.is_active,
  };
}

export default function Customers() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(isDemoMode ? customers : []);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadCustomers() {
      try {
        const users = await getAdminCustomers({ signal: controller.signal });
        if (!controller.signal.aborted) setRows(users.map(toRow));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadCustomers();
    return () => controller.abort();
  }, []);

  const search = query.trim().toLowerCase();
  const filtered = rows.filter((row) =>
    `${row.name} ${row.email}`.toLowerCase().includes(search),
  );

  return (
    <>
      <DashboardHeader eyebrow="Clients" title="Customers" subtitle="Customer profiles and no-show history." showIcons />
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        </div>
      </div>

      {loading && <p role="status">Loading customers…</p>}
      {error && <p role="alert" className="notice notice--warning">Couldn’t load customers. {error}</p>}

      {!loading && !error && (
        <Panel title={`${filtered.length} customers`}>
          <DataTable
            columns={columns}
            rows={filtered}
            emptyMessage={search ? 'No customers match that search.' : 'No customers yet.'}
          />
        </Panel>
      )}
    </>
  );
}