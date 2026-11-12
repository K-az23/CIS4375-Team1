import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import { api } from '../../api/client';
import { checkoutStateForOrder, formatDate, specsFromCatalogKeys } from '../../api/format';
import { specFields, formatSpec } from '../../data/hairOptions';
import { business } from '../../data/business';
import { money } from '../../data/sampleData';

export default function HairSpecs() {
  const navigate = useNavigate();
  // undefined while loading, null when the customer has no saved system yet.
  const [system, setSystem] = useState(undefined);
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    api('/api/hairpiece-orders/saved-system')
      .then((data) => setSystem(data.saved_system))
      .catch((err) => {
        setSystem(null);
        setError(err.message);
      });
  }, []);

  async function reorder() {
    setError('');
    setReordering(true);
    try {
      const data = await api('/api/hairpiece-orders/reorder', { method: 'POST' });
      navigate('/checkout', { state: checkoutStateForOrder(data.order) });
    } catch (err) {
      // 409 explains itself, e.g. an earlier re-order is still unpaid.
      setError(err.message);
      setReordering(false);
    }
  }

  const bookConsultation = (
    <div className="card stack">
      <h4>Need a change?</h4>
      <p className="small muted">Changes to your system are made with us in the salon so it still fits perfectly.</p>
      <div><a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Book a consultation</a></div>
    </div>
  );

  if (system === undefined) {
    return (
      <>
        <DashboardHeader eyebrow="Hair system" title="My hair system" subtitle="Saved from your consultation. Re-order it any time." />
        <p className="muted">Loading…</p>
      </>
    );
  }

  if (system === null) {
    return (
      <>
        <DashboardHeader eyebrow="Hair system" title="My hair system" subtitle="Saved from your consultation. Re-order it any time." />
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
        <div className="cust-grid">
          <Panel title="No saved system yet">
            <p className="muted">
              Your custom system is saved here after your first full system is ordered and paid.
              It starts with a consultation in the salon.
            </p>
          </Panel>
          <aside className="cust-aside">{bookConsultation}</aside>
        </div>
      </>
    );
  }

  const specs = specsFromCatalogKeys(system.specs);

  return (
    <>
      <DashboardHeader eyebrow="Hair system" title="My hair system" subtitle="Saved from your consultation. Re-order it any time." />
      {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}

      <div className="cust-grid">
        <Panel title={system.system_label}>
          <SpecList rows={specFields.map((f) => [f.label, formatSpec(f.key, specs[f.key])])} />
        </Panel>

        <aside className="cust-aside">
          <div className="card stack">
            <div className="stat-card__label">Re-order price</div>
            <div className="stat-card__value">{money(system.price)}</div>
            <p className="field-hint">Last ordered {formatDate(system.last_ordered)}. Arrives in about 10 days.</p>
            <button className="btn btn-dark btn-block" onClick={reorder} disabled={reordering}>
              {reordering ? 'Starting re-order…' : <>Re-order this system <ArrowRight size={18} /></>}
            </button>
          </div>
          {bookConsultation}
        </aside>
      </div>
    </>
  );
}
