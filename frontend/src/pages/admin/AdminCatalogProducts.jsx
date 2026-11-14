import { useEffect, useState } from 'react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import SpecList from '../../components/SpecList';
import { money } from '../../data/sampleData';
import { specFields, formatSpec } from '../../data/hairOptions';
import {
  getAdminCatalog, getAdminCatalogItem, createCatalogItem, updateCatalogItem,
  deactivateCatalogItem, formCatalog, catalogError,
} from '../../services/catalog';

function blankProduct() {
  return { item_name: '', description: '', system_type: 'area', is_active: true };
}

function ProductForm({ id, onSaved, onClose }) {
  const [form, setForm] = useState(blankProduct);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(id !== null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (id === null) return;
    const controller = new AbortController();
    // Read fresh details so an old list row cannot overwrite a newer edit.
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const item = await getAdminCatalogItem(id, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setForm({ item_name: item.item_name, description: item.description,
          system_type: item.system_type, is_active: item.is_active });
        setVersion(item.version);
        setError('');
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(catalogError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id, reload]);

  function change(event) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm({ ...form, [event.target.name]: value });
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const item = id === null ? await createCatalogItem(form)
        : await updateCatalogItem(id, { ...form, version });
      onSaved(item);
    } catch (error) {
      setError(catalogError(error));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (busy || !window.confirm('Hide this product from the public catalog? Existing orders will remain saved.')) return;
    setBusy(true);
    setError('');
    try {
      onSaved(await deactivateCatalogItem(id, version));
    } catch (error) {
      setError(catalogError(error));
    } finally {
      setBusy(false);
    }
  }

  return <Panel title={id === null ? 'New catalog product' : `Product #${id}`}>
    {loading && <p role="status">Loading product details…</p>}
    {loadError && <p role="alert" className="notice notice--warning">{loadError}</p>}
    {loadError && <button className="btn btn-outline" type="button" onClick={() => setReload(reload + 1)}>Retry details</button>}
    {!loading && !loadError && <form className="form" onSubmit={save} style={{ marginTop: 12 }}>
      {error && <p role="alert" className="notice notice--warning">{error}</p>}
      <fieldset disabled={busy} style={{ padding: 0, margin: 0, border: 0 }}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="catalog-name">Product name</label>
            <input id="catalog-name" name="item_name" required maxLength={120} value={form.item_name} onChange={change} />
          </div>
          <div className="field">
            <label htmlFor="catalog-system">System type</label>
            <select id="catalog-system" name="system_type" value={form.system_type} onChange={change}>
              <option value="area">Hair loss area system — online order</option>
              <option value="full">Full custom system — consultation</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="catalog-description">Description</label>
          <textarea id="catalog-description" name="description" rows={3} maxLength={2000} value={form.description} onChange={change} />
        </div>
        <label className="checkbox"><input name="is_active" type="checkbox" checked={form.is_active} onChange={change} /> Active in the public catalog</label>
        <p className="field-hint">The system type determines its approved price and hair options. Full custom systems are quoted after consultation.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-gold" type="submit">{busy ? 'Saving…' : id === null ? 'Create product' : 'Save changes'}</button>
          <button className="btn btn-outline" type="button" onClick={onClose}>Close form</button>
          {id !== null && <button className="btn btn-outline" type="button" onClick={() => {
            if (window.confirm('Reload saved details and replace your unsaved entries?')) setReload(reload + 1);
          }}>Reload saved details</button>}
          {id !== null && form.is_active && <button className="btn btn-outline" type="button" onClick={deactivate}>Deactivate product</button>}
        </div>
      </fieldset>
    </form>}
    {(loading || loadError) && <button className="btn btn-outline" type="button" onClick={onClose}>Close form</button>}
  </Panel>;
}

export default function AdminCatalogProducts() {
  const [items, setItems] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [filter, setFilter] = useState('All');
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminCatalog({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setItems(data.items);
          setCatalog(formCatalog(data));
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(catalogError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [reload]);

  function saved(item) {
    setItems((previous) => [item, ...(previous || []).filter((row) => row.catalog_item_id !== item.catalog_item_id)]
      .sort((a, b) => a.item_name.localeCompare(b.item_name)));
    setEditor(null);
    setFilter('All');
    setMessage(`Product #${item.catalog_item_id} saved.`);
  }

  const rows = items?.filter((item) => filter === 'All' || item.is_active === (filter === 'Active'));
  const columns = [
    { key: 'item_name', label: 'Product' },
    { key: 'system_label', label: 'System' },
    { key: 'price', label: 'Price', render: (row) => `${row.price_is_minimum ? 'From ' : ''}${money(row.price)}` },
    { key: 'is_active', label: 'Status', render: (row) => row.is_active ? 'Active' : 'Inactive' },
    { key: 'actions', label: '', render: (row) => <button className="btn btn-outline btn-sm" type="button"
      disabled={editor !== null || loading} onClick={() => { setEditor({ id: row.catalog_item_id }); setMessage(''); }}>Details / edit</button> },
  ];

  return <>
    {catalog && <Panel title="Current pricing and hair options">
      <SpecList rows={[
        ['Area system', money(catalog.areaPrice)], ['Full custom system', `From ${money(catalog.customFrom)}`],
        ['Delivery to salon', `About ${catalog.shippingDays} days`],
        ...specFields.map((field) => [field.label, catalog.options[field.key].map((value) => formatSpec(field.key, value)).join(', ')]),
      ]} />
    </Panel>}
    <Panel title="Catalog products" action={<button className="btn btn-dark btn-sm" type="button"
      disabled={editor !== null || loading} onClick={() => { setEditor({ id: null }); setMessage(''); }}>New product</button>}>
      {message && <p role="status" className="notice">{message}</p>}
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn btn-outline btn-sm" type="button" disabled={loading || editor !== null} onClick={() => setReload(reload + 1)}>{loading ? 'Loading…' : 'Refresh products'}</button>
        <label htmlFor="catalog-filter">Show</label>
        <select id="catalog-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
          {['All', 'Active', 'Inactive'].map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="notice notice--warning">Couldn’t load catalog. {error}</p>}
      {rows && <DataTable columns={columns} rows={rows.map((item) => ({ ...item, id: item.catalog_item_id }))}
        emptyMessage={items.length ? 'No products with this status.' : 'No catalog products yet.'} />}
    </Panel>
    {editor !== null && <ProductForm key={editor.id ?? 'new'} id={editor.id} onSaved={saved} onClose={() => setEditor(null)} />}
  </>;
}
