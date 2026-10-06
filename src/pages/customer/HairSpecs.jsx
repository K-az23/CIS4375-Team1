import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import { specFields, formatSpec } from '../../data/hairOptions';
import { business } from '../../data/business';
import { currentCustomer, money } from '../../data/sampleData';

export default function HairSpecs() {
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