import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader';
import SpecList from '../../components/SpecList';
import { money } from '../../data/sampleData';
import { specFields, formatSpec } from '../../data/hairOptions';
import { getCatalogItems, getCatalogItem, getCatalogOptions, formOptions, catalogError } from '../../services/catalog';

function ProductDetails({ id, onChoose, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Load this product and its options before showing its choices.
    async function load() {
      setError('');
      setDetails(null);
      try {
        const [item, choices] = await Promise.all([
          getCatalogItem(id, { signal: controller.signal }),
          getCatalogOptions(id, { signal: controller.signal }),
        ]);
        if (!controller.signal.aborted) setDetails({ item, choices, options: formOptions(choices.options) });
      } catch (error) {
        if (!controller.signal.aborted) setError(catalogError(error));
      }
    }
    load();
    return () => controller.abort();
  }, [id, reload]);

  return <article className="card stack" style={{ marginTop: 20 }}>
    {!details && !error && <p role="status">Loading product details and options…</p>}
    {error && <p role="alert" className="notice notice--warning">{error}</p>}
    {error && <button type="button" className="btn btn-outline" onClick={() => setReload(reload + 1)}>Retry details</button>}
    {details && <>
      <h3>{details.item.item_name}</h3>
      <p>{details.item.description}</p>
      <p>{details.item.price_is_minimum ? 'From ' : ''}{money(details.item.price)} · About {details.choices.shipping_days} days to the salon</p>
      <SpecList rows={specFields.map((field) => [field.label,
        details.options[field.key].map((value) => formatSpec(field.key, value)).join(', ')])} />
      {details.item.system_type === 'area'
        ? <button className="btn btn-dark" type="button" onClick={() => onChoose(details.item, details.choices)}>Customize this product</button>
        : <><p>Full custom systems are measured and quoted after a consultation. Custom dimensions are available at that consultation.</p>
          <Link className="btn btn-dark" to="/account/book">Book a consultation</Link></>}
    </>}
    <div><button className="btn btn-outline" type="button" onClick={onClose}>Close details</button></div>
  </article>;
}

export default function CatalogProducts({ onChoose }) {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCatalog() {
      setError('');
      setLoading(true);
      try {
        const result = await getCatalogItems({ signal: controller.signal });
        if (!controller.signal.aborted) setItems(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(catalogError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadCatalog();
    return () => controller.abort();
  }, [reload]);

  return <section className="section"><div className="container">
    <SectionHeader eyebrow="Catalog" title="Hair system products" />
    {loading && <p role="status">Loading catalog products…</p>}
    {error && <p role="alert" className="notice notice--warning">Couldn’t load catalog products. {error}</p>}
    <div style={{ marginBottom: 12 }}><button className="btn btn-outline btn-sm" type="button" disabled={loading}
      onClick={() => { setSelected(null); setReload(reload + 1); }}>Refresh products</button></div>
    {items?.length === 0 && <p className="muted">No catalog products are available right now.</p>}
    {items?.length > 0 && <div className="two-col">
      {items.map((item) => <article key={item.catalog_item_id} className="card stack">
        <h3>{item.item_name}</h3>
        {item.description && <p className="muted">{item.description}</p>}
        <p>{item.price_is_minimum ? 'From ' : ''}{money(item.price)}</p>
        <button className="btn btn-outline" type="button" disabled={loading || Boolean(error)} onClick={() => setSelected(item.catalog_item_id)}>View details</button>
      </article>)}
    </div>}
    {selected !== null && <ProductDetails key={selected} id={selected} onChoose={onChoose} onClose={() => setSelected(null)} />}
  </div></section>;
}
