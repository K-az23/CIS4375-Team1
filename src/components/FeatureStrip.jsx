import { Link } from 'react-router-dom';

export default function FeatureStrip({ items }) {
  return (
    <section className="feature-strip">
      <div className="container feature-strip__grid" style={{ '--cols': items.length }}>
        {items.map(({ title, text, icon: Icon, to, href }) => {
          const content = (
            <>
              {Icon && <Icon size={22} />}
              <h4>{title}</h4>
              <p>{text}</p>
            </>
          );
          if (to) return <Link key={title} to={to} className="feature-strip__item">{content}</Link>;
          if (href) {
            return (
              <a key={title} href={href} target="_blank" rel="noreferrer" className="feature-strip__item">
                {content}
              </a>
            );
          }
          return <div key={title} className="feature-strip__item">{content}</div>;
        })}
      </div>
    </section>
  );
}