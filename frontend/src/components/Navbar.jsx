import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/useAuth.js';
import { homeFor } from '../context/authUtils.js';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/hair-catalog', label: 'Hair Catalog' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar({ variant = 'public' }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Logo />

        <button
          className="navbar__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`navbar__links ${open ? 'is-open' : ''}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={close}
              className={({ isActive }) => (isActive ? 'navbar__link is-active' : 'navbar__link')}
            >
              {link.label}
            </NavLink>
          ))}

          {variant === 'public' && user && (
            <div className="navbar__actions">
              <Link to={homeFor(user.role)} className="btn btn-gold btn-sm" onClick={close}>My dashboard</Link>
            </div>
          )}
          {variant === 'public' && !user && (
            <div className="navbar__actions">
              <Link to="/login" className="navbar__login" onClick={close}>Log In</Link>
              <Link to="/signup" className="btn btn-gold btn-sm" onClick={close}>Sign Up</Link>
            </div>
          )}
          {variant === 'account' && (
            <div className="navbar__actions">
              <Link to="/account/settings" className="navbar__icon" aria-label="My account" onClick={close}>
                <User size={22} />
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}