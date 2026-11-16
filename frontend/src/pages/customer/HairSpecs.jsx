import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import ChoiceGroup from '../../components/ChoiceGroup';
import { api } from '../../api/client';
import {
  checkoutStateForOrder,
  formatDate,
  specsFromCatalogKeys,
} from '../../api/format';
import {
  pricing,
  specFields,
  formatSpec,
} from '../../data/hairOptions';
import { business } from '../../data/business';
import { money } from '../../data/sampleData';

const API_KEYS = {
  hairType: 'hair_type',
  baseType: 'base_type',
  skinThickness: 'skin_thickness',
  color: 'color',
  greyPercent: 'grey_percent',
  density: 'density',
  dimensions: 'dimensions',
};

export default function HairSpecs() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [agreed, setAgreed] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;

    api('/api/hairpiece-orders/saved-systems')
      .then((data) => {
        if (!active) return;

        const rows = data.saved_systems ?? [];
        setSystems(rows);
        setSelectedId(
          rows.length ? String(rows[0].order_id) : ''
        );
      })
      .catch((err) => {
        if (!active) return;

        setSystems([]);
        setError(err.message);
      });

    api('/api/catalog')
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((err) => {
        if (active) setCatalogError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const system = systems?.find(
    (row) => String(row.order_id) === selectedId
  ) ?? null;

  const specs = system
    ? specsFromCatalogKeys(system.specs)
    : {};

  const validDraft = Boolean(catalog) && specFields.every(
    (field) => catalog.options?.[API_KEYS[field.key]]?.includes(
      draft[field.key]
    )
  );

  const shippingDays = catalog?.shipping_days
    ?? pricing.shippingDays;

  function selectSystem(event) {
    setSelectedId(event.target.value);
    setEditing(false);
    setAgreed(false);
    setError('');
  }

  function startEditing() {
    setDraft(specsFromCatalogKeys(system.specs));
    setEditing(true);
    setAgreed(false);
    setError('');
  }

  async function reorder() {
    if (
      !system
      || busy.current
      || (editing && (!validDraft || !agreed))
    ) {
      return;
    }

    busy.current = true;
    setError('');
    setReordering(true);

    try {
      const body = {
        source_order_id: system.order_id,
      };

      if (editing) {
        body.specs = Object.fromEntries(
          Object.entries(API_KEYS).map(([key, apiKey]) => [
            apiKey,
            draft[key],
          ])
        );
      }

      const data = await api(
        '/api/hairpiece-orders/reorder',
        { method: 'POST', body }
      );

      navigate('/checkout', {
        state: checkoutStateForOrder(data.order),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setReordering(false);
    }
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Hair system"
        title="My hair system"
        subtitle="Choose a previous paid purchase to re-order. The most recent order is selected first."
      />

      {error && (
        <p className="notice notice--warning">
          <Info size={16} /> {error}
        </p>
      )}

      {systems === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="cust-grid">
          <div className="stack">
            {systems.length === 0 && !error && (
              <Panel title="No saved system yet">
                <p className="muted">
                  Paid full custom systems and hair loss area
                  systems appear here. Your first full custom
                  system starts with a salon consultation.
                </p>
              </Panel>
            )}

            {systems.length > 0 && (
              <Panel title="Previous purchases">
                <label className="field">
                  <span>Choose a paid order</span>
                  <select
                    value={selectedId}
                    onChange={selectSystem}
                    disabled={reordering}
                  >
                    {systems.map((row, index) => (
                      <option
                        key={row.order_id}
                        value={String(row.order_id)}
                      >
                        #{row.order_id} · {row.system_label}
                        {' · '}{formatDate(row.last_ordered)}
                        {index === 0 ? ' · Most recent' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </Panel>
            )}

            {system && (
              <Panel
                title={
                  editing
                    ? 'Configure a new area system'
                    : system.system_label
                }
              >
                {editing ? (
                  <>
                    {specFields.map((field) => (
                      <ChoiceGroup
                        key={field.key}
                        field={field}
                        options={
                          catalog.options?.[API_KEYS[field.key]]
                          ?? []
                        }
                        value={draft[field.key]}
                        onChange={(key, value) => setDraft(
                          (current) => ({
                            ...current,
                            [key]: value,
                          })
                        )}
                      />
                    ))}
                    <p className="field-hint">
                      These choices create a new order.
                      Your previous purchase stays saved.
                    </p>
                  </>
                ) : (
                  <SpecList
                    rows={specFields.map((field) => [
                      field.label,
                      formatSpec(field.key, specs[field.key]),
                    ])}
                  />
                )}
              </Panel>
            )}
          </div>

          <aside className="cust-aside">
            {system && (
              <div className="card stack">
                <div className="stat-card__label">
                  Re-order price
                </div>

                <div className="stat-card__value">
                  {money(system.reorder_price ?? system.price)}
                </div>

                <p className="field-hint">
                  Previous order #{system.order_id}:
                  {' '}{money(system.price)} on
                  {' '}{formatDate(system.last_ordered)}.
                  Arrives in about {shippingDays} days.
                </p>

                {editing && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(
                        event.target.checked
                      )}
                      disabled={reordering}
                    />
                    I understand hair systems cannot be returned
                    once ordered from the vendor.
                  </label>
                )}

                <button
                  className="btn btn-dark btn-block"
                  onClick={reorder}
                  disabled={
                    reordering
                    || (editing && (!validDraft || !agreed))
                  }
                >
                  {reordering ? 'Starting re-order…' : (
                    <>
                      {editing
                        ? 'Review new configuration'
                        : 'Re-order this system'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {system.can_reconfigure && !editing && (
                  <button
                    className="btn btn-outline btn-block"
                    onClick={startEditing}
                    disabled={reordering || !catalog}
                  >
                    Configure a new area system
                  </button>
                )}

                {editing && (
                  <button
                    className="btn btn-outline btn-block"
                    onClick={() => setEditing(false)}
                    disabled={reordering}
                  >
                    Keep original specifications
                  </button>
                )}

                {system.can_reconfigure && catalogError && (
                  <p className="field-hint">
                    Catalog options could not load.
                    Reload to configure a new system.
                  </p>
                )}
              </div>
            )}

            <div className="card stack">
              <h4>Need a consultation?</h4>
              <p className="small muted">
                Changes to a full custom system are made with us
                in the salon so it still fits correctly.
              </p>
              <div>
                <a
                  href={business.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Book a consultation
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}