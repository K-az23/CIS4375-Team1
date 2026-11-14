import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import { specFields, formatSpec } from '../../data/hairOptions';
import { business } from '../../data/business';
import { currentCustomer, money } from '../../data/sampleData';
import { isDemoMode } from '../../context/authUtils.js';
import { getOrderCatalog, orderDate } from '../../services/orders';
import { catalogKeys } from '../../services/catalog';
import OrderSummary from '../../components/OrderSummary';
import {
  getHairSpecifications, createHairSpecification, updateHairSpecification,
  getConsultationSystem, reorderConsultationSystem,
  hairSpecificationFields, hairSpecificationRows, hairSpecificationError,
} from '../../services/hairSpecifications';

function DemoHairSpecs() {
  const navigate = useNavigate();
  const system = currentCustomer.savedSystem;

  function reorder() {
    navigate('/checkout', { state: { order: { title: `${system.name} (re-order)`, specs: system.specs, price: system.price } } });
  }

  return (
    <>
      <DashboardHeader eyebrow="Hair system" title="My hair system" subtitle="Saved from your consultation. Re-order it any time." />

      <div className="cust-grid">
        <Panel title={system.name}>
          <SpecList rows={specFields.map((f) => [f.label, formatSpec(f.key, system.specs[f.key])])} />
        </Panel>

        <aside className="cust-aside">
          <div className="card stack">
            <div className="stat-card__label">Re-order price</div>
            <div className="stat-card__value">{money(system.price)}</div>
            <p className="field-hint">Last ordered {system.lastOrdered}. Arrives in about 10 days.</p>
            <button className="btn btn-dark btn-block" onClick={reorder}>Re-order this system <ArrowRight size={18} /></button>
          </div>
          <div className="card stack">
            <h4>Need a change?</h4>
            <p className="small muted">Changes to your system are made with us in the salon so it still fits perfectly.</p>
            <div><a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Book a consultation</a></div>
          </div>
        </aside>
      </div>
    </>
  );
}

function initialForm(item) {
  return {
    name: item?.name || '', system_type: item?.system_type || 'area',
    specs: Object.fromEntries(hairSpecificationFields.map(([key]) => [key, String(item?.specs?.[key] ?? '')])),
  };
}

function HairChoiceForm({ initial, catalog, onChanged, onClose }) {
  const [form, setForm] = useState(() => initialForm(initial));
  const [version, setVersion] = useState(initial?.version ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);

  const complete = form.name.trim() && hairSpecificationFields.every(([key]) => {
    if (key === 'dimensions' && form.system_type === 'full') return form.specs[key].trim().length > 0;
    return catalog.options[key].some((value) => String(value) === form.specs[key]);
  });

  function changeChoice(key, value) {
    setForm({ ...form, specs: { ...form.specs, [key]: value } });
    setError('');
  }

  function changeType(type) {
    const specs = { ...form.specs };
    if (type === 'area' && !catalog.options.dimensions.includes(specs.dimensions)) specs.dimensions = '';
    setForm({ ...form, system_type: type, specs });
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    if (saveLock.current || !complete) return;
    saveLock.current = true;
    setBusy(true);
    setError('');
    // Keep the form filled if validation or the server rejects this save.
    const fields = { name: form.name, system_type: form.system_type,
      specs: { ...form.specs, grey_percent: Number(form.specs.grey_percent) } };
    try {
      const saved = initial
        ? await updateHairSpecification(initial.specification_id, { ...fields, version })
        : await createHairSpecification(fields);
      onChanged(saved);
    } catch (error) {
      setError(hairSpecificationError(error));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  async function reloadSaved() {
    if (busy || !window.confirm('Reload your saved choices and replace unsaved entries?')) return;
    setBusy(true);
    setError('');
    try {
      const records = await getHairSpecifications();
      const saved = records.find((item) => item.specification_id === initial.specification_id);
      if (!saved) throw new Error('These saved choices could not be found.');
      setForm(initialForm(saved));
      setVersion(saved.version);
      onChanged(saved, false);
    } catch (error) {
      setError(hairSpecificationError(error));
    } finally {
      setBusy(false);
    }
  }

  return <Panel title={initial ? `Edit saved choices #${initial.specification_id}` : 'New saved hair choices'}>
    <form className="form" onSubmit={save} style={{ marginTop: 12 }}>
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      <fieldset disabled={busy} style={{ padding: 0, margin: 0, border: 0 }}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="saved-hair-name">Name for these choices</label>
            <input id="saved-hair-name" required maxLength={100} value={form.name}
              onChange={(event) => { setForm({ ...form, name: event.target.value }); setError(''); }} />
          </div>
          <div className="field">
            <label htmlFor="saved-hair-type">System type</label>
            <select id="saved-hair-type" value={form.system_type} onChange={(event) => changeType(event.target.value)}>
              {catalog.system_types.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </div>
        </div>
        {hairSpecificationFields.map(([key, label]) => <div className="field" key={key}>
          <label htmlFor={`saved-hair-${key}`}>{label}</label>
          {key === 'dimensions' && form.system_type === 'full'
            ? <input id={`saved-hair-${key}`} required maxLength={100} value={form.specs[key]}
              placeholder="Your preferred dimensions; confirm measurements at consultation"
              onChange={(event) => changeChoice(key, event.target.value)} />
            : <select id={`saved-hair-${key}`} required value={form.specs[key]} onChange={(event) => changeChoice(key, event.target.value)}>
              <option value="">Choose {label.toLowerCase()}</option>
              {form.specs[key] !== '' && !catalog.options[key].some((value) => String(value) === form.specs[key]) &&
                <option value={form.specs[key]} disabled>Previously saved: {form.specs[key]} — choose a current option</option>}
              {catalog.options[key].map((value) => <option key={value} value={String(value)}>{key === 'grey_percent' ? `${value}%` : value}</option>)}
            </select>}
        </div>)}
        <p className="field-hint">These saved choices do not change past orders or replace measurements confirmed in the salon.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-gold" type="submit" disabled={!complete}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Save choices'}</button>
          <button className="btn btn-outline" type="button" onClick={onClose}>Close form</button>
          {initial && <button className="btn btn-outline" type="button" onClick={reloadSaved}>Reload saved choices</button>}
        </div>
      </fieldset>
    </form>
  </Panel>;
}

function ConsultationSystem({ system, error, loading }) {
  const [savedOrder, setSavedOrder] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const saveLock = useRef(false);

  async function reorder() {
    if (saveLock.current) return;
    saveLock.current = true;
    setBusy(true);
    setSaveError('');
    try {
      setSavedOrder(await reorderConsultationSystem());
    } catch (error) {
      setSaveError(hairSpecificationError(error));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  return <Panel title="Consultation system">
    {loading && !system && <p role="status">Loading your consultation system…</p>}
    {error && <p role="alert" className="notice notice--warning">Couldn’t load your consultation system. {error}</p>}
    {!loading && !error && !system && <p>No paid full custom system is saved yet. Book a consultation to have your system fitted.</p>}
    {system && <>
      <SpecList rows={hairSpecificationRows(system.specs)} />
      <p>Re-order price: {money(system.price)} · Last ordered {orderDate(system.last_ordered)}</p>
      <p className="field-hint">These details come from your fitted system’s paid order. Changes are confirmed at the salon.</p>
      {saveError && <p role="alert" className="notice notice--warning">{saveError}</p>}
      {savedOrder ? <>
        <p role="status" className="notice">Re-order #{savedOrder.order_id} saved with an unpaid invoice. No payment was taken here.</p>
        <OrderSummary order={savedOrder} />
      </> : <button className="btn btn-dark" type="button" disabled={busy || Boolean(error) || loading} onClick={reorder}>
        {busy ? 'Saving…' : 'Create unpaid re-order'}
      </button>}
      <div style={{ marginTop: 12 }}><Link to="/account/orders">View my orders</Link></div>
    </>}
    <div style={{ marginTop: 12 }}><Link className="btn btn-outline" to="/account/book">Book a consultation</Link></div>
  </Panel>;
}

function LiveHairSpecs() {
  const navigate = useNavigate();
  const [records, setRecords] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Load each section separately so one failed request does not hide the others.
    async function load() {
      setLoading(true);
      setErrors({});
      const results = await Promise.allSettled([
        getHairSpecifications({ signal: controller.signal }),
        getOrderCatalog({ signal: controller.signal }),
        getConsultationSystem({ signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      const nextErrors = {};
      if (results[0].status === 'fulfilled') setRecords(results[0].value);
      else nextErrors.choices = hairSpecificationError(results[0].reason);
      if (results[1].status === 'fulfilled') setCatalog(results[1].value);
      else { setCatalog(null); nextErrors.catalog = hairSpecificationError(results[1].reason); }
      if (results[2].status === 'fulfilled') setSystem(results[2].value);
      else nextErrors.system = hairSpecificationError(results[2].reason);
      setErrors(nextErrors);
      setLoading(false);
    }
    load();
    return () => controller.abort();
  }, [reload]);

  function changed(saved, close = true) {
    setRecords((previous) => [saved, ...(previous || []).filter((item) => item.specification_id !== saved.specification_id)]);
    if (close) {
      setEditor(null);
      setMessage(`Saved choices “${saved.name}”.`);
    }
  }

  function reviewArea(item) {
    const specs = Object.fromEntries(Object.entries(catalogKeys).map(([apiKey, formKey]) => [formKey, item.specs[apiKey]]));
    const price = catalog.system_types.find((type) => type.key === 'area').price;
    navigate('/checkout', { state: { order: { title: item.name, specs, price, shippingDays: catalog.shipping_days } } });
  }

  return <>
    <DashboardHeader eyebrow="Hair system" title="My hair system" subtitle="Your saved choices and consultation system.">
      <button className="btn btn-dark btn-sm" type="button" disabled={loading || !catalog || editor !== null || Boolean(errors.choices)}
        onClick={() => { setEditor({ initial: null }); setMessage(''); }}>New saved choices</button>
    </DashboardHeader>
    <div className="page-stack">
      {message && <p role="status" className="notice">{message}</p>}
      <div><button className="btn btn-outline btn-sm" type="button" disabled={loading || editor !== null}
        onClick={() => setReload(reload + 1)}>{loading ? 'Loading…' : 'Refresh saved choices'}</button></div>
      {errors.catalog && <p role="alert" className="notice notice--warning">Couldn’t load current hair options. {errors.catalog}</p>}
      {errors.choices && <p role="alert" className="notice notice--warning">Couldn’t load saved choices. {errors.choices}</p>}
      {editor && <HairChoiceForm key={editor.initial?.specification_id ?? 'new'} initial={editor.initial} catalog={catalog}
        onChanged={changed} onClose={() => setEditor(null)} />}
      {!loading && records?.length === 0 && <Panel title="Saved choices"><p>No saved hair choices yet. Choose New saved choices to add your first set.</p></Panel>}
      {records?.map((item) => <Panel key={item.specification_id} title={item.name}>
        <p className="field-hint">{item.system_type === 'area' ? 'Hair loss area system' : 'Full custom system preferences'} · Saved {orderDate(item.updated_at)}</p>
        <SpecList rows={hairSpecificationRows(item.specs)} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-outline" type="button" disabled={loading || !catalog || editor !== null || Boolean(errors.choices)}
            onClick={() => { setEditor({ initial: item }); setMessage(''); }}>Edit choices</button>
          {item.system_type === 'area'
            ? <button className="btn btn-dark" type="button" disabled={loading || !catalog || editor !== null || Boolean(errors.choices)} onClick={() => reviewArea(item)}>Review an area-system order</button>
            : <Link className="btn btn-outline" to="/account/book">Confirm at consultation</Link>}
        </div>
      </Panel>)}
      <ConsultationSystem system={system} loading={loading} error={errors.system} />
    </div>
  </>;
}

export default function HairSpecs() {
  return isDemoMode ? <DemoHairSpecs /> : <LiveHairSpecs />;
}
