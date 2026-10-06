import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { business } from '../../data/business';
import { nextAppointment, customerAppointments } from '../../data/sampleData';

const columns = [
  { key: 'date', label: 'Date', nowrap: true },
  { key: 'service', label: 'Service' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

export default function Appointments() {
  return (
    <>
      <DashboardHeader eyebrow="Appointments" title="My appointments" subtitle="Changes and cancellations are made in Setmore.">
        <Link to="/account/book" className="btn btn-gold btn-sm">Book appointment</Link>
      </DashboardHeader>

      <div className="page-stack">
        <div className="card stat-card" style={{ maxWidth: 560 }}>
          <div className="stat-card__top">
            <div>
              <div className="stat-card__label">Upcoming</div>
              <div className="big-line">{nextAppointment.date}</div>
              <div className="stat-card__note">{nextAppointment.time} · {nextAppointment.service}</div>
            </div>
            <span className="icon-circle"><CalendarCheck size={18} /></span>
          </div>
          <div className="stat-card__link">
            <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="link-gold">Reschedule or cancel in Setmore</a>
          </div>
        </div>

        <Panel title="Past appointments">
          <DataTable columns={columns} rows={customerAppointments} />
        </Panel>
      </div>
    </>
  );
}