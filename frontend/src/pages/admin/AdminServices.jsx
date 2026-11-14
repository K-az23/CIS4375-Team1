import { useEffect, useState } from 'react';
import Panel from '../../components/Panel';
import {
  getAdminServices,
  createService,
  updateService,
  deactivateService,
  serviceError,
} from '../../services/services';

const emptyForm = {
  service_name: '',
  description: '',
  duration_minutes: '30',
  price: '0',
  setmore_service_id: '',
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function AdminServices() {
  const [services, setServices] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [showInactive, setShowInactive] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  // Read the saved services when this component opens or Refresh is clicked.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setError('');
      setServices(null);

      try {
        const rows = await getAdminServices({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setServices(rows);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(serviceError(error));
        }
      }
    }

    load();

    return () => controller.abort();
  }, [reload]);

  // An empty form creates a service. A filled form edits the selected service.
  function openForm(service = null) {
    setError('');
    setNotice('');
    setEditingId(service?.service_id ?? null);

    setForm(
      service
        ? {
            service_name: service.service_name,
            description: service.description || '',
            duration_minutes: String(service.duration_minutes),
            price: String(service.price),
            setmore_service_id: service.setmore_service_id || '',
          }
        : { ...emptyForm }
    );
  }

  function update(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // Replace the matching table row with the record Flask actually saved.
  function keepSaved(service) {
    setServices((current) => {
      const others = (current || []).filter(
        (row) => row.service_id !== service.service_id
      );

      return [...others, service].sort((a, b) =>
        a.service_name.localeCompare(b.service_name)
      );
    });
  }

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError('');
    setNotice('');

    const fields = {
      service_name: form.service_name.trim(),
      description: form.description.trim() || null,
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
      setmore_service_id: form.setmore_service_id.trim() || null,
    };

    try {
      const saved = editingId === null
        ? await createService(fields)
        : await updateService(editingId, fields);

      keepSaved(saved);
      setForm(null);
      setNotice('Service saved.');
    } catch (error) {
      // Leave the form filled when saving fails so the admin can retry.
      setError(serviceError(error));
    } finally {
      setBusy(false);
    }
  }

  // Deactivation preserves past appointments and service-material records.
  async function changeActive(service) {
    if (busy) return;

    if (
      service.is_active &&
      !window.confirm(
        `Deactivate ${service.service_name}? Past records will stay saved.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const saved = service.is_active
        ? await deactivateService(service.service_id)
        : await updateService(service.service_id, {
            is_active: true,
          });

      keepSaved(saved);

      setNotice(
        service.is_active
          ? 'Service deactivated.'
          : 'Service reactivated.'
      );
    } catch (error) {
      setError(serviceError(error));
    } finally {
      setBusy(false);
    }
  }

  const visible = (services || []).filter(
    (service) => showInactive || service.is_active
  );

  return (
    <Panel title="Services">
      <div className="stack">
        <div className="row">
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => openForm()}
            disabled={busy || services === null}
          >
            New service
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setReload((value) => value + 1)}
            disabled={busy}
          >
            Refresh services
          </button>

          <label>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) =>
                setShowInactive(event.target.checked)
              }
            />{' '}
            Show inactive
          </label>
        </div>

        {error && (
          <p role="alert" className="notice notice--warning">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}

        {services === null && !error && (
          <p role="status">Loading services…</p>
        )}

        {form && (
          <form className="form" onSubmit={save}>
            <h3>
              {editingId === null ? 'New service' : 'Edit service'}
            </h3>

            <fieldset
              disabled={busy}
              style={{ border: 0, padding: 0 }}
            >
              <div className="form-row">
                <div className="field">
                  <label htmlFor="service-name">Service name</label>
                  <input
                    id="service-name"
                    name="service_name"
                    required
                    maxLength={100}
                    value={form.service_name}
                    onChange={update}
                  />
                </div>

                <div className="field">
                  <label htmlFor="service-duration">
                    Duration (minutes)
                  </label>
                  <input
                    id="service-duration"
                    name="duration_minutes"
                    type="number"
                    min="1"
                    max="600"
                    step="1"
                    required
                    value={form.duration_minutes}
                    onChange={update}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="service-price">Price ($)</label>
                  <input
                    id="service-price"
                    name="price"
                    type="number"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={update}
                  />
                </div>

                <div className="field">
                  <label htmlFor="service-setmore">
                    Setmore service ID (optional)
                  </label>
                  <input
                    id="service-setmore"
                    name="setmore_service_id"
                    maxLength={100}
                    value={form.setmore_service_id}
                    onChange={update}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="service-description">
                  Description (optional)
                </label>
                <textarea
                  id="service-description"
                  name="description"
                  maxLength={255}
                  value={form.description}
                  onChange={update}
                />
              </div>
            </fieldset>

            <div className="row">
              <button
                type="submit"
                className="btn btn-gold"
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save service'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setForm(null)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {services !== null && visible.length === 0 && (
          <p>No services match this view.</p>
        )}

        {services !== null && visible.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Minutes</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((service) => (
                  <tr key={service.service_id}>
                    <td>{service.service_name}</td>
                    <td>{service.duration_minutes}</td>
                    <td>{money.format(service.price)}</td>
                    <td>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </td>

                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busy}
                          onClick={() => openForm(service)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busy}
                          onClick={() => changeActive(service)}
                        >
                          {service.is_active
                            ? 'Deactivate'
                            : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}