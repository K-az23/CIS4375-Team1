import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function DashboardHeader({ eyebrow, title, subtitle, showIcons = false, children }) {
  return (
    <div className="dash-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="dash-header__title">{title}</h1>
        {subtitle && <p className="dash-header__subtitle">{subtitle}</p>}
      </div>
      <div className="dash-header__right">
        {children}
        {showIcons && (
          <Link to="/admin/settings" className="icon-btn" aria-label="Settings"><Settings size={20} /></Link>
        )}
      </div>
    </div>
  );
}