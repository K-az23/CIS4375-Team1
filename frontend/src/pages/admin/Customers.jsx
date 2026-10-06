import { useState } from 'react';
import { Search } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { customers, money } from '../../data/sampleData';

const NO_SHOW_LIMIT = 3;

const columns = [
  { key: 'name', label: 'Name', nowrap: true },
  { key: 'email', label: 'Email' },
  { key: 'lastVisit', label: 'Last visit', nowrap: true },
  { key: 'card', label: 'Card', render: (r) => <StatusBadge status={r.card ? 'On file' : 'No card'} /> },
  { key: 'noShows', label: 'No-shows', align: 'right' },
  { key: 'totalSpent', label: 'Total spent', align: 'right', render: (r) => money(r.totalSpent) },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.noShows >= NO_SHOW_LIMIT ? 'Restricted' : 'Active'} /> },
];

export default function Customers() {
  const [query, setQuery] = useState('');
  const filtered = customers.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <DashboardHeader eyebrow="Clients" title="Customers" subtitle="Profiles, cards on file and no-show history." showIcons />
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        </div>
      </div>
      <Panel title={`${filtered.length} customers`}>
        <DataTable columns={columns} rows={filtered} emptyMessage="No customers match that search." />
      </Panel>
    </>
  );
}