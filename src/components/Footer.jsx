import { Link } from 'react-router-dom';
import { MapPin, Mail, Clock } from 'lucide-react';
import Logo from './Logo';
import SocialLinks from './SocialLinks';
import { business } from '../data/business';

const quickLinks = [
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/hair-catalog', label: 'Hair Catalog' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/login', label: 'Client Log In' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Logo />
            <p className="footer__about">
              Non-surgical hair replacement and styling for men and women, serving Cypress and the surrounding area.
            </p>
          </div>

          <div>
            <h4>Visit</h4>
            <ul className="footer__list">
              <li className="footer__contact-item">
                <MapPin size={15} />
                <span>{business.addressLine1}<br />{business.addressLine2}</span>
              </li>
              <li className="footer__contact-item">
                <Mail size={15} />
                <a href={`mailto:${business.email}`}>{business.email}</a>
              </li>
              <li className="footer__contact-item">
                <Clock size={15} />
                <span className="footer__hours">
                  {business.hours.map((h) => (
                    <span key={h.days} style={{ display: 'contents' }}>
                      <span>{h.days}</span>
                      <span>{h.time}</span>
                    </span>
                  ))}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4>Explore</h4>
            <ul className="footer__list">
              {quickLinks.map((link) => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Follow</h4>
            <SocialLinks />
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {business.name}. All rights reserved.</span>
          <span>By appointment only · Closed major holidays</span>
        </div>
      </div>
    </footer>
  );
}