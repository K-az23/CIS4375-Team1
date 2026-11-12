import { useEffect, useState } from 'react';
import { Pencil, Plus, X, Trash2, Check, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import ServiceList from '../../components/ServiceList';
import SpecList from '../../components/SpecList';
import { api } from '../../api/client';
import { groupServices } from '../../api/services';
import { serviceCategories } from '../../data/services';
import { hairOptions, pricing, specFields, formatSpec } from '../../data/hairOptions';

function formatPrice(value) {
  const v = String(value).trim();
  if (!v) return '';
  if (/^free$/i.test(v)) return 'Free';
  const n = v.replace(/[^0-9.]/g, '');
  return n ? `$${n}` : v;
}

function EditButton({ onClick }) {
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={onClick}>
      <Pencil size={15} /> Edit
    </button>
  );
}

function SaveBar({ onSave, onCancel }) {
  return (
    <div className="edit-actions">
      <button type="button" className="btn btn-dark btn-sm" onClick={onSave}><Check size={16} /> Save changes</button>
      <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/*  Hair system options  */
function OptionsPanel({ options, onSave, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(options);
  const [newValues, setNewValues] = useState({});

  function start() {
    setDraft(options);
    setNewValues({});
    setEditing(true);
  }

  function removeOption(key, value) {
    setDraft({ ...draft, [key]: draft[key].filter((v) => v !== value) });
  }

  function addOption(key) {
    const raw = (newValues[key] ?? '').trim();
    if (!raw) return;
    const value = key === 'greyPercent' ? Number(raw.replace('%', '')) : raw;
    if (key === 'greyPercent' && Number.isNaN(value)) return;
    if (draft[key].includes(value)) return;
    const list = [...draft[key], value];
    if (key === 'greyPercent') list.sort((a, b) => a - b);
    setDraft({ ...draft, [key]: list });
    setNewValues({ ...newValues, [key]: '' });
  }

  function save() {
    onSave(draft);
    setEditing(false);
  }

  return (
    <Panel title="Hair system options" action={!readOnly && !editing && <EditButton onClick={start} />}>
      {!editing ? (
        <SpecList rows={specFields.map((f) => [f.label, options[f.key].map((v) => formatSpec(f.key, v)).join(', ')])} />
      ) : (
        <div className="edit-stack">
          {specFields.map((f) => (
            <div key={f.key} className="option-edit">
              <div className="option-edit__label">{f.label}</div>
              <div className="chip-list">
                {draft[f.key].map((v) => (
                  <span key={v} className="edit-chip">
                    {formatSpec(f.key, v)}
                    <button type="button" aria-label={`Remove ${formatSpec(f.key, v)}`} onClick={() => removeOption(f.key, v)}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="add-row">
                <input
                  aria-label={`New ${f.label.toLowerCase()} option`}
                  placeholder={f.key === 'greyPercent' ? 'e.g. 90' : 'Add an option'}
                  value={newValues[f.key] ?? ''}
                  onChange={(e) => setNewValues({ ...newValues, [f.key]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption(f.key))}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => addOption(f.key)}><Plus size={15} /> Add</button>
              </div>
            </div>
          ))}
          <SaveBar onSave={save} onCancel={() => setEditing(false)} />
        </div>
      )}
    </Panel>
  );
}

/*  Hair system pricing  */
function PricingPanel({ prices, onSave, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prices);

  const fields = [
    { key: 'areaSystem', label: 'Hair loss area system (online)', prefix: '$' },
    { key: 'customFrom', label: 'Full custom system starts at', prefix: '$' },
    { key: 'shippingDays', label: 'Delivery to salon (days)' },
  ];

  function save() {
    onSave({
      ...draft,
      areaSystem: Number(draft.areaSystem) || 0,
      customFrom: Number(draft.customFrom) || 0,
      shippingDays: Number(draft.shippingDays) || 0,
    });
    setEditing(false);
  }

  return (
    <Panel title="Hair system pricing" action={!readOnly && !editing && <EditButton onClick={() => { setDraft(prices); setEditing(true); }} />}>
      {!editing ? (
        <SpecList rows={[
          ['Hair loss area system (online)', `$${prices.areaSystem}`],
          ['Full custom system (invoice)', `From $${prices.customFrom}`],
          ['Delivery to salon', `About ${prices.shippingDays} days`],
        ]} />
      ) : (
        <div className="edit-stack">
          {fields.map((f) => (
            <div key={f.key} className="field">
              <label htmlFor={`price-${f.key}`}>{f.label}</label>
              <div className={f.prefix ? 'input-prefix' : undefined}>
                {f.prefix && <span>{f.prefix}</span>}
                <input
                  id={`price-${f.key}`}
                  type="number"
                  min="0"
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              </div>
            </div>
          ))}
          <SaveBar onSave={save} onCancel={() => setEditing(false)} />
        </div>
      )}
    </Panel>
  );
}

/*  Services (one panel per category)  */
const blankService = { name: '', price: '', duration: '', description: '' };

function ServicesPanel({ category, onSave, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.services);

  function update(index, key, value) {
    setDraft(draft.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }

  function save() {
    const cleaned = draft
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        price: formatPrice(s.price) || 'Free',
        ...(s.duration?.trim() ? { duration: s.duration.trim() } : {}),
        ...(s.description?.trim() ? { description: s.description.trim() } : {}),
      }));
    onSave(cleaned);
    setEditing(false);
  }

  return (
    <Panel
      title={category.heading}
      action={!readOnly && !editing && <EditButton onClick={() => { setDraft(category.services); setEditing(true); }} />}
    >
      {!editing ? (
        <ServiceList services={category.services} />
      ) : (
        <div className="edit-stack">
          {draft.map((s, i) => (
            <div key={i} className="service-edit">
              <div className="service-edit__top">
                <div className="field">
                  <label htmlFor={`${category.id}-name-${i}`}>Service name</label>
                  <input id={`${category.id}-name-${i}`} value={s.name} onChange={(e) => update(i, 'name', e.target.value)} />
                </div>
                <button type="button" className="icon-btn" aria-label={`Remove ${s.name || 'service'}`} onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor={`${category.id}-price-${i}`}>Price</label>
                  <input id={`${category.id}-price-${i}`} placeholder="$40 or Free" value={s.price} onChange={(e) => update(i, 'price', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${category.id}-duration-${i}`}>Length (optional)</label>
                  <input id={`${category.id}-duration-${i}`} placeholder="45 min" value={s.duration ?? ''} onChange={(e) => update(i, 'duration', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`${category.id}-desc-${i}`}>Description (optional)</label>
                <textarea id={`${category.id}-desc-${i}`} rows={2} value={s.description ?? ''} onChange={(e) => update(i, 'description', e.target.value)} />
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm add-service" onClick={() => setDraft([...draft, { ...blankService }])}>
            <Plus size={15} /> Add a service
          </button>
          <SaveBar onSave={save} onCancel={() => setEditing(false)} />
        </div>
      )}
    </Panel>
  );
}

export default function Catalog() {
  const [options, setOptions] = useState(hairOptions);
  const [prices, setPrices] = useState(pricing);
  const [categories, setCategories] = useState(serviceCategories);
  const [message, setMessage] = useState('');

  // What customers actually see: hair options and prices are set in the backend
  // (logic/catalog.py), and services come from Setmore. Editing here would be
  // overwritten, so the panels are read-only; the edit code stays for later.
  useEffect(() => {
    api('/api/catalog')
      .then((data) => {
        const keys = { hair_type: 'hairType', base_type: 'baseType', skin_thickness: 'skinThickness', color: 'color', grey_percent: 'greyPercent', density: 'density', dimensions: 'dimensions' };
        setOptions(Object.fromEntries(Object.entries(data.options).map(([k, v]) => [keys[k] ?? k, v])));
        const price = Object.fromEntries(data.system_types.map((t) => [t.key, t.price]));
        setPrices({ areaSystem: price.area, customFrom: price.full, shippingDays: data.shipping_days });
      })
      .catch(() => {});
    api('/api/services')
      .then((data) => setCategories(groupServices(data.services)))
      .catch(() => {});
  }, []);

  function saved(text) {
    setMessage(text);
  }

  return (
    <>
      <DashboardHeader eyebrow="Website content" title="Catalog" subtitle="Services and hair system options shown on the website." showIcons />
      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}
        <p className="notice notice--info"><Info size={16} /> Services and their prices come from Setmore: change them there, then use Sync from Setmore on the Calendar. Hair system options and prices are set by the developers.</p>

        <div className="two-col" style={{ alignItems: 'start' }}>
          <OptionsPanel readOnly options={options} onSave={(o) => { setOptions(o); saved('Hair system options saved.'); }} />
          <PricingPanel readOnly prices={prices} onSave={(p) => { setPrices(p); saved('Hair system pricing saved.'); }} />
        </div>

        <div className="report-grid" style={{ alignItems: 'start' }}>
          {categories.map((c) => (
            <ServicesPanel
              key={c.id}
              readOnly
              category={c}
              onSave={(services) => {
                setCategories(categories.map((cat) => (cat.id === c.id ? { ...cat, services } : cat)));
                saved(`${c.heading} saved.`);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}