import { colorSwatches, formatSpec } from '../data/hairOptions';

// One row of option buttons, e.g. "Density: Light / Medium / Heavy".
// Used by the Hair Catalog and the owner's custom order form.
export default function ChoiceGroup({ field, options, value, onChange }) {
  return (
    <div className="choice-group">
      <div>
        <div className="choice-group__label">{field.label}</div>
        {field.hint && <div className="choice-group__hint">{field.hint}</div>}
      </div>
      <div className="choices" role="group" aria-label={field.label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            className={`choice ${value === option ? 'is-selected' : ''}`}
            onClick={() => onChange(field.key, option)}
          >
            {field.key === 'color' && <span className="swatch" style={{ background: colorSwatches[option] }} />}
            {formatSpec(field.key, option)}
          </button>
        ))}
      </div>
    </div>
  );
}