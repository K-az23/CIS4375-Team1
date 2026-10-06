import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SpecList from '../../components/SpecList';
import { business } from '../../data/business';
import { todaysAppointments } from '../../data/sampleData';

const columns = [
  { key: 'time', label: 'Time', nowrap: true },
  { key: 'customer', label: 'Client' },
  { key: 'services', label: 'Service', render: (r) => r.services.join(', ') },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function Calendar() {
  return (
    <>
      <DashboardHeader eyebrow="Schedule" title="Calendar" subtitle="Bookings are managed in Setmore and synced here." showIcons>
        <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open Setmore</a>
        <Link to="/admin/checkout" className="btn btn-dark btn-sm">Check out clients <ArrowRight size={16} /></Link>
      </DashboardHeader>

      <div className="cust-grid">
        <Panel title="Today">
          <DataTable columns={columns} rows={todaysAppointments} />
        </Panel>
        <Panel title="Business hours">
          <SpecList rows={business.hours.map((h) => [h.days, h.time])} />
          <p className="field-hint" style={{ marginTop: 12 }}>Closed major holidays. Hair system services 75 min, haircuts 45 min.</p>
        </Panel>
      </div>
    </>
  );
}