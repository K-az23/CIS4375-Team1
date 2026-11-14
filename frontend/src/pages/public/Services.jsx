import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import PageHero from '../../components/PageHero';
import ServiceList from '../../components/ServiceList';
import ServiceTabs from '../../components/ServiceTabs';
import { groupServices } from '../../api/services';
import { business } from '../../data/business';
import { images } from '../../data/images';
import {
  getServices,
  getService,
} from '../../services/services';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Give the existing components the fields they expect.
function toListItem(service) {
  return {
    id: service.service_id,
    name: service.service_name,
    duration: service.duration_minutes == null
      ? ''
      : `${service.duration_minutes} min`,
    price: service.price == null
      ? 'Ask for pricing'
      : Number(service.price) === 0
        ? 'Free'
        : currency.format(service.price),
  };
}

// Load one service when the visitor selects it.
function ServiceDetails({ serviceId }) {
  const [service, setService] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setService(null);
      setError('');

      try {
        const saved = await getService(serviceId, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setService(saved);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [serviceId]);

  if (error) {
    return (
      <p role="alert" className="notice notice--warning">
        Couldn’t load service details. {error}
      </p>
    );
  }

  if (!service) {
    return <p role="status">Loading service details…</p>;
  }

  const item = toListItem(service);

  return (
    <div className="card stack">
      <h3>{item.name}</h3>

      <p>
        {service.description ||
          'Contact the salon for more information about this service.'}
      </p>

      <p>
        {item.duration} · {item.price}
      </p>
    </div>
  );
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Read the live services from Flask.
  // Keep empty and failed results separate from a successful list.
  useEffect(() => {
    const controller = new AbortController();

    async function loadServices() {
      try {
        const result = await getServices({
          signal: controller.signal,
        });

        if (!Array.isArray(result)) {
          throw new Error(
            'The server returned an invalid services list.'
          );
        }

        if (!controller.signal.aborted) {
          setServices(result.map(toListItem));
          setCategories(
            result.length ? groupServices(result) : []
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => controller.abort();
  }, []);

  // Use the first available category if the selected one is absent.
  const category = categories.find(
    (item) => item.id === tab
  ) ?? categories[0];

  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Services & pricing"
        subtitle="Hair systems, cuts and color for men and women. Appointments only."
        image={images.salonChair}
      >
        <a
          href={business.bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-gold"
        >
          Book appointment <ArrowRight size={18} />
        </a>
      </PageHero>

      <section className="section">
        <div className="container services-layout">
          <div>
            <h2>Available services</h2>

            {loading && (
              <p role="status">Loading services...</p>
            )}

            {error && (
              <p
                role="alert"
                className="notice notice--warning"
              >
                Couldn’t load services. {error}
              </p>
            )}

            {!loading && !error && services.length === 0 && (
              <p className="muted">
                No services are available right now.
              </p>
            )}

            {!loading && !error && services.length > 0 && (
              <div>
                <ServiceTabs
                  options={categories.map((item) => ({
                    value: item.id,
                    label: item.label,
                  }))}
                  value={category.id}
                  onChange={setTab}
                />

                <h2 style={{ marginTop: 16 }}>
                  {category.heading}
                </h2>

                <p className="muted">{category.intro}</p>

                <ServiceList services={category.services} />

                {category.photos && (
                  <div
                    className={`photo-row ${
                      category.photoShape === 'wide'
                        ? 'photo-row--wide'
                        : ''
                    }`}
                  >
                    {category.photos.map((photo) => (
                      <img
                        key={photo.src}
                        className="photo"
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading && !error && services.length > 0 && (
              <div
                className="stack"
                style={{ marginTop: 16 }}
              >
                <div className="field">
                  <label htmlFor="public-service-details">
                    Learn more about a service
                  </label>

                  <select
                    id="public-service-details"
                    value={selectedId}
                    onChange={(event) =>
                      setSelectedId(event.target.value)
                    }
                  >
                    <option value="">Select a service</option>

                    {services.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedId && (
                  <ServiceDetails
                    key={selectedId}
                    serviceId={selectedId}
                  />
                )}
              </div>
            )}

            <p
              className="small muted"
              style={{ marginTop: 16 }}
            >
              Hair systems are sold separately.
              See the Hair Catalog for pricing.
            </p>
          </div>

          <aside className="policy">
            <h3>Before you book</h3>

            <ul>
              <li>All services are by appointment only.</li>
              <li>
                No card or deposit is needed to book;
                services are paid at the salon.
              </li>
              <li>Please cancel at least 12 hours ahead.</li>
              <li>
                Arriving more than 15 minutes late counts
                as a no-show.
              </li>
              <li>No refunds once hair has been applied or cut.</li>
              <li>We can't serve clients with open sores or lice.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}