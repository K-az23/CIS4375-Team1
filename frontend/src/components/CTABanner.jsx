import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Use `to` for a page on this site or `href` for an outside link (Setmore).
export default function CTABanner({ eyebrow, title, text, buttonLabel, to, href }) {
  const button = to ? (
    <Link to={to} className="btn btn-gold">{buttonLabel} <ArrowRight size={18} /></Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className="btn btn-gold">
      {buttonLabel} <ArrowRight size={18} />
    </a>
  );

  return (
    <div className="cta">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p className="cta__text">{text}</p>}
      </div>
      {button}
    </div>
  );
}