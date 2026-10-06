import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, note, linkLabel, to }) {
  return (
    <div className="card stat-card">
      <div className="stat-card__top">
        <div>
          <div className="stat-card__label">{label}</div>
          <div className="stat-card__value">{value}</div>
          {note && <div className="stat-card__note">{note}</div>}
        </div>
        <span className="icon-circle"><Icon size={18} /></span>
      </div>
      {linkLabel && (
        <div className="stat-card__link">
          <Link to={to} className="link-gold">{linkLabel} <ArrowRight size={15} /></Link>
        </div>
      )}
    </div>
  );
}