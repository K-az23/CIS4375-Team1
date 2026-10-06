export default function BarChart({ data, prefix = '$' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bar-chart" style={{ '--bars': data.length }}>
      {data.map((d, i) => (
        <div key={i} className="bar-chart__col">
          <span className="bar-chart__value">{prefix}{d.value.toLocaleString()}</span>
          <div
            className={`bar-chart__bar ${d.today ? 'is-today' : ''}`}
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="bar-chart__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}