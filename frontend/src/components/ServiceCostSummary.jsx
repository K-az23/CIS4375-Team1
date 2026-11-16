import { useEffect, useState } from 'react';
import Panel from './Panel';
import { api } from '../api/client';
import { money } from '../data/sampleData';

export default function ServiceCostSummary({ days = 7 }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await api(
          `/api/admin/reports/service-costs?days=${days}`
        );

        if (active) {
          setReport(data);
          setError('');
        }
      } catch (error) {
        if (active) setError(error.message);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [days, reload]);

  return (
    <Panel
      title={
        days === 1
          ? 'Service payments today'
          : `Service payments · last ${days} days`
      }
    >
      <button
        className="btn btn-outline btn-sm"
        onClick={() => setReload(reload + 1)}
      >
        Refresh service totals
      </button>

      {error ? (
        <p role="alert" className="notice notice--warning">
          Could not load service totals. {error}
        </p>
      ) : !report ? (
        <p role="status">Loading service totals…</p>
      ) : (
        <>
          <p>
            Service sales: <strong>{money(report.service_sales)}</strong>
          </p>
          <p>
            Recorded product costs:{' '}
            <strong>{money(report.known_product_cost)}</strong>
          </p>

          {report.missing_cost_visits > 0 ? (
            <p>
              Costs are missing for {report.missing_cost_visits} older
              service payment(s). A complete result cannot be calculated.
            </p>
          ) : (
            <p>
              Service sales after product costs:{' '}
              <strong>{money(report.after_product_cost)}</strong>
            </p>
          )}

          <p className="field-hint">
            These totals use payments recorded in person.
            They exclude other business expenses and do not estimate
            payments for older completed visits.
          </p>
        </>
      )}
    </Panel>
  );
}