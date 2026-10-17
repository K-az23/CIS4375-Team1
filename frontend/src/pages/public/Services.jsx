import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import PageHero from '../../components/PageHero';
import ServiceTabs from '../../components/ServiceTabs';
import ServiceList from '../../components/ServiceList';
import { serviceCategories } from '../../data/services';
import { business } from '../../data/business';
import { images } from '../../data/images';
import { getServices } from '../../services/services';

export default function Services() {
  const [tab, setTab] = useState(serviceCategories[0].id);
  const category = serviceCategories.find((c) => c.id === tab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check that this page can get services from the backend.
  useEffect(() => {
    const controller = new AbortController();

    async function loadServices() {
      try {
        await getServices({
          signal: controller.signal,
        });

      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        // Stop showing the loading message after the request finishes.
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadServices();

    // Stop the request when the visitor leaves the page.
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
            <div className="services-bar">
              <ServiceTabs
                options={serviceCategories.map((c) => ({ value: c.id, label: c.label }))}
                value={tab}
                onChange={setTab}
              />
            </div>
            <h2 style={{ marginBottom: 4 }}>{category.heading}</h2>
            <p className="muted" style={{ marginBottom: 24 }}>{category.intro}</p>
            {loading && <p role="status">Loading services...</p>}

            {error && (
              <p role="alert" className="notice notice--warning">
                {error}
              </p>
            )}
            <ServiceList services={category.services} />
            {category.photos && (
              <div className={`photo-row ${category.photoShape === 'wide' ? 'photo-row--wide' : ''}`}>
                {category.photos.map((photo) => (
                  <img key={photo.src} className="photo" src={photo.src} alt={photo.alt} loading="lazy" />
                ))}
              </div>
            )}
            {tab === 'systems' && (
              <p className="small muted" style={{ marginTop: 16 }}>
                Hair systems are sold separately. See the Hair Catalog for pricing.
              </p>
            )}
          </div>

          <aside className="policy">
            <h3>Before you book</h3>
            <ul>
              <li>All services are by appointment only.</li>
              <li>A card on file is required to book. No deposit is charged.</li>
              <li>Cancel at least 12 hours ahead to avoid a cancellation fee.</li>
              <li>No-shows for hair replacement services are charged $50.</li>
              <li>Arriving more than 15 minutes late counts as a no-show.</li>
              <li>No refunds once hair has been applied or cut.</li>
              <li>We can't serve clients with open sores or lice.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}