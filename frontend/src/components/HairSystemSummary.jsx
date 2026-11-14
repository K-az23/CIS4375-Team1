import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import SpecList from './SpecList';
import { getHairSpecifications, getConsultationSystem, hairSpecificationRows, hairSpecificationError } from '../services/hairSpecifications';

export default function HairSystemSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const choices = await getHairSpecifications({ signal: controller.signal });
        let next = choices.length ? { title: choices[0].name, specs: choices[0].specs } : null;
        if (!next) {
          const fitted = await getConsultationSystem({ signal: controller.signal });
          if (fitted) next = { title: 'Consultation system', specs: fitted.specs };
        }
        if (!controller.signal.aborted) setSummary(next);
      } catch (error) {
        if (!controller.signal.aborted) setError(hairSpecificationError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [reload]);

  const rows = summary ? hairSpecificationRows(summary.specs).filter(([label]) => ['Color', 'Grey percentage', 'Density', 'Dimensions'].includes(label)) : [];
  return <section className="card overview-card">
    <div className="overview-card__head"><span className="icon-circle"><Scissors size={18} /></span>
      <span className="overview-card__label">My hair system</span></div>
    {loading && <p role="status">Loading saved hair choices…</p>}
    {error && <p role="alert" className="notice notice--warning">{error}</p>}
    {error && <button className="btn btn-outline btn-sm" type="button" onClick={() => setReload(reload + 1)}>Retry</button>}
    {!loading && !error && !summary && <p>No saved hair choices yet.</p>}
    {!loading && !error && summary && <><p>{summary.title}</p><SpecList rows={rows} /></>}
    <div className="overview-card__footer"><Link className="btn btn-outline" to="/account/hair-system">View full details</Link></div>
  </section>;
}
