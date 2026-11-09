import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import PageHero from '../../components/PageHero';
import ServiceList from '../../components/ServiceList';
import { business } from '../../data/business';
import { images } from '../../data/images';
import { getServices } from '../../services/services';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function toListItem(service) {
  return {
    id: service.service_id,
    name: service.service_name,
    duration: service.duration_minutes == null ? '' : `${service.duration_minutes} min`,
    price: service.price == null ? 'Ask for pricing'
      : Number(service.price) === 0 ? 'Free' : currency.format(service.price),
  };
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadServices() {
      try {
        const result = await getServices({ signal: controller.signal });

        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid services list.');
        }

        if (!controller.signal.aborted) {
          setServices(result.map(toListItem));
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

  return (
    <>
      <PageHero eyebrow="Services" title="Services & pricing" subtitle="Hair systems, cuts and color for men and women. Appointments only." image={images.salonChair}>
        <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">
          Book appointment <ArrowRight size={18} />
        </a>
      </PageHero>

      <section className="section">
        <div className="container services-layout">
          <div>
            <h2>Available services</h2>

            {loading && <p role="status">Loading services...</p>}

            {error && (
              <p role="alert" className="notice notice--warning">
                Couldn’t load services. {error}
              </p>
            )}

            {!loading && !error && services.length === 0 && (
              <p className="muted">No services are available right now.</p>
            )}

            {!loading && !error && services.length > 0 && (
              <ServiceList services={services} />
            )}

            <p className="small muted" style={{ marginTop: 16 }}>
              Hair systems are sold separately. See the Hair Catalog for pricing.
            </p>
          </div>

          <aside className="policy">
            <h3>Before you book</h3>
            <ul>
              <li>All services are by appointment only.</li>
              <li>A card on file is required to book. No deposit is charged.</li>
              <li>Cancel at least 12 hours ahead to avoid a cancellation fee.</li>
              <li>No-shows for hair replacement services are charged $50.</li>
              <li>No refunds once hair has been applied or cut.</li>
              <li>We can't serve clients with open sores or lice.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}