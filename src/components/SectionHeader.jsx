export default function SectionHeader({ eyebrow, title, text, center = false }) {
  return (
    <div className={`section-header ${center ? 'section-header--center' : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}