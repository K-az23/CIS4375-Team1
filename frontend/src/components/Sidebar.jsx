import { NavLink } from 'react-router-dom';

export default function Sidebar({ links, top, label, bottom }) {
  return (
    <aside className="sidebar">
      {top && <div className="sidebar__brand">{top}</div>}
      {label && <div className="sidebar__label">{label}</div>}

      <nav className="sidebar__nav">
        {links.map(({ to, label: text, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'sidebar__link is-active' : 'sidebar__link')}
          >
            <Icon size={18} />
            {text}
          </NavLink>
        ))}
      </nav>

      {bottom && <div className="sidebar__footer">{bottom}</div>}
    </aside>
  );
}