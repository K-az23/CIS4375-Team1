import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Panel({ title, linkLabel, to, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel__head">
        <h2 className="panel__title">{title}</h2>
        {linkLabel && <Link to={to} className="link-gold">{linkLabel} <ArrowRight size={16} /></Link>}
        {action}
      </div>
      {children}
    </section>
  );
}