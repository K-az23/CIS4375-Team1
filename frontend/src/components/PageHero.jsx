export default function PageHero({ eyebrow, title, subtitle, image, imagePosition = 'center', children }) {
  const style = image
    ? {
        backgroundImage: `linear-gradient(rgba(17,17,17,.6), rgba(17,17,17,.85)), url(${image})`,
        backgroundPosition: imagePosition,
      }
    : undefined;

  return (
    <section className="hero" style={style}>
      <div className="container hero__inner">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p className="hero__subtitle">{subtitle}</p>}
        {children && <div className="hero__actions">{children}</div>}
      </div>
    </section>
  );
}