import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import Panel from '../../components/Panel';
import { isDemoMode } from '../../context/authUtils.js';
import { getServiceMaterials } from '../../services/serviceMaterials';
import { getServices } from '../../services/services';

const columns = [
  { key: 'item', label: 'Inventory item' },
  { key: 'quantity', label: 'Default quantity', align: 'right' },
  { key: 'unit', label: 'Unit' },
];

function MaterialsList({ serviceId }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMaterials() {
      try {
        const materials = await getServiceMaterials(serviceId, { signal: controller.signal });
        if (!Array.isArray(materials)) {
          throw new Error('The server returned an invalid materials list.');
        }

        if (!controller.signal.aborted) {
          setRows(materials.map((material) => ({
            id: material.service_item_id ?? material.item_id,
            item: material.item_name || `Item #${material.item_id}`,
            quantity: material.default_quantity_used ?? '—',
            unit: material.unit || '—',
          })));
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadMaterials();
    return () => controller.abort();
  }, [serviceId]);

  if (error) {
    return <p role="alert" className="notice notice--warning">Couldn’t load materials. {error}</p>;
  }

  if (!rows) {
    return <p role="status">Loading materials…</p>;
  }

  return <DataTable columns={columns} rows={rows} emptyMessage="No materials are configured for this service." />;
}

export default function ServiceMaterials() {
  const [services, setServices] = useState(null);
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function loadServices() {
      try {
        const result = await getServices({ signal: controller.signal });
        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid services list.');
        }

        if (!controller.signal.aborted) setServices(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadServices();
    return () => controller.abort();
  }, []);

  return (
    <Panel title="Service materials">
      <div className="stack">
        {isDemoMode && <p className="muted">Sign in as an admin to view service materials.</p>}
        {!isDemoMode && !services && !error && <p role="status">Loading services…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load services. {error}</p>}
        {services?.length === 0 && <p className="muted">No active services are available.</p>}

        {services?.length > 0 && (
          <div className="field">
            <label htmlFor="materials-service">Service</label>
            <select id="materials-service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.service_id} value={service.service_id}>{service.service_name}</option>
              ))}
            </select>
          </div>
        )}

        {serviceId && <MaterialsList key={serviceId} serviceId={serviceId} />}
      </div>
    </Panel>
  );
}
