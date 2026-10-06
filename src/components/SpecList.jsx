export default function SpecList({ rows }) {
  return (
    <div className="spec-list">
      {rows.map(([label, value]) => (
        <div key={label} className="spec-list__row">
          <span className="spec-list__label">{label}</span>
          <span className="spec-list__value">{value}</span>
        </div>
      ))}
    </div>
  );
}