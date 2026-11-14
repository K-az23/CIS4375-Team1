import { useEffect, useState } from 'react';
import CustomerDetails from './CustomerDetails';
import { Search } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { isDemoMode } from '../../context/authUtils.js';
import { customers, money } from '../../data/sampleData';
import { getAdminCustomers } from '../../services/users';
import { getCustomerSpending } from '../../services/reports';
import { formatDate } from '../../api/format';

const NO_SHOW_LIMIT = 3;

function customerStatus(row) {
  if (row.isActive === false) return 'Inactive';

  return row.noShows >= NO_SHOW_LIMIT
    ? 'Restricted'
    : 'Active';
}

const columns = [
  {
    key: 'name',
    label: 'Name',
    nowrap: true,
  },
  {
    key: 'email',
    label: 'Email',
  },
  {
    key: 'lastVisit',
    label: 'Last visit',
    nowrap: true,
    render: (row) =>
      isDemoMode ? row.lastVisit : formatDate(row.lastVisit),
  },
  {
    key: 'noShows',
    label: 'No-shows',
    align: 'right',
  },
  {
    key: 'totalSpent',
    label: 'Total spent',
    align: 'right',
    render: (row) =>
      row.totalSpent == null ? '—' : money(row.totalSpent),
  },
  ...(isDemoMode ? [] : [{
    key: 'membership',
    label: 'Membership',
    render: (row) => row.isMember ? 'Member' : 'Standard',
  }]),
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <StatusBadge status={customerStatus(row)} />
    ),
  },
];

// Keep the existing table's field names.
function toRow(user) {
  return {
    id: user.user_id,
    name: [user.first_name, user.last_name]
      .filter(Boolean)
      .join(' '),
    email: user.email,
    noShows: user.no_show_count ?? 0,
    isActive: user.is_active,
    isMember: user.is_member,
    lastVisit: user.last_visit,
  };
}

export default function Customers() {
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(isDemoMode ? customers : []);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState('');
  const [spendingError, setSpendingError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadCustomers() {
      try {
        // Read main's spending totals alongside the customer list.
        // A report failure should not hide customer management.
        const [users, spending] = await Promise.all([
          getAdminCustomers({
            signal: controller.signal,
          }),
          getCustomerSpending({
            signal: controller.signal,
          }).catch((error) => {
            if (!controller.signal.aborted) {
              setSpendingError(error.message);
            }

            return null;
          }),
        ]);

        const totals = Object.fromEntries(
          (spending?.customers ?? []).map((item) => [
            item.user_id,
            item.total_spent,
          ])
        );

        if (!controller.signal.aborted) {
          setRows(
            users.map((user) => ({
              ...toRow(user),
              totalSpent: spending
                ? totals[user.user_id] ?? 0
                : null,
            }))
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => controller.abort();
  }, []);

  // Update the saved customer while keeping their report columns.
  function receiveUpdatedCustomer(user) {
    setRows((current) =>
      current.map((row) =>
        row.id === user.user_id
          ? {
              ...toRow({
                ...user,
                last_visit: user.last_visit ?? row.lastVisit,
              }),
              totalSpent: row.totalSpent,
            }
          : row
      )
    );
  }

  const tableColumns = [...columns];

  if (!isDemoMode) {
    tableColumns.push({
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={saving || selectedId === row.id}
          onClick={() => setSelectedId(row.id)}
        >
          Details
        </button>
      ),
    });
  }

  const search = query.trim().toLowerCase();

  const filtered = rows.filter((row) =>
    `${row.name} ${row.email}`
      .toLowerCase()
      .includes(search)
  );

  return (
    <>
      <DashboardHeader
        eyebrow="Clients"
        title="Customers"
        subtitle="Customer profiles and no-show history."
        showIcons
      />

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search by name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search customers"
          />
        </div>
      </div>

      {loading && (
        <p role="status">Loading customers…</p>
      )}

      {error && (
        <p role="alert" className="notice notice--warning">
          Couldn’t load customers. {error}
        </p>
      )}

      {spendingError && (
        <p role="alert" className="notice notice--warning">
          Couldn’t load customer spending. {spendingError}
        </p>
      )}

      {!loading && !error && (
        <Panel title={`${filtered.length} customers`}>
          <DataTable
            columns={tableColumns}
            rows={filtered}
            emptyMessage={
              search
                ? 'No customers match that search.'
                : 'No customers yet.'
            }
          />
        </Panel>
      )}

      {!isDemoMode && selectedId != null && (
        <CustomerDetails
          key={selectedId}
          userId={selectedId}
          onUpdated={receiveUpdatedCustomer}
          onBusyChange={setSaving}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}