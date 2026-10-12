import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';

export default function Sidebar({ links, top, label, bottom, onLogout }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const current =
    links.find((l) => (l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(`${l.to}/`))) ?? links[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <aside className="sidebar">
      {top && <div className="sidebar__brand">{top}</div>}
      {label && <div className="sidebar__label">{label}</div>}

      <div className="sidebar__menu" ref={menuRef}>
        <button
          type="button"
          className="sidebar__toggle"
          aria-expanded={open}
          aria-controls="sidebar-nav"
          onClick={() => setOpen(!open)}
        >
          <CurrentIcon size={18} />
          <span className="sidebar__toggle-label">{current.label}</span>
          <ChevronDown size={18} className={`sidebar__chevron ${open ? 'is-open' : ''}`} />
        </button>

        <nav id="sidebar-nav" className={`sidebar__nav ${open ? 'is-open' : ''}`}>
          {links.map(({ to, label: text, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'sidebar__link is-active' : 'sidebar__link')}
            >
              <Icon size={18} />
              {text}
            </NavLink>
          ))}

          {onLogout && (
            <>
              <div className="sidebar__divider" role="separator" />
              <button
                type="button"
                className="sidebar__link sidebar__nav-logout"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={18} />
                Log Out
              </button>
            </>
          )}
        </nav>
      </div>

      {bottom && <div className="sidebar__footer">{bottom}</div>}
    </aside>
  );
}