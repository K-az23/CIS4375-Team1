import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import PageHero from '../../components/PageHero';
import ServiceTabs from '../../components/ServiceTabs';
import ServiceList from '../../components/ServiceList';
import { api } from '../../api/client';
import { groupServices } from '../../api/services';
import { serviceCategories } from '../../data/services';
import { business } from '../../data/business';
import { images } from '../../data/images';

export default function Services() {
  const [categories, setCategories] = useState(serviceCategories);
  const [tab, setTab] = useState(serviceCategories[0].id);

  useEffect(() => {
    api('/api/services')
      .then((data) => setCategories(groupServices(data.services)))
      .catch(() => {});
  }, []);

  // If the chosen tab has no synced services, fall back to the first one shown.
  const category = categories.find((c) => c.id === tab) ?? categories[0];

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
                options={categories.map((c) => ({ value: c.id, label: c.label }))}
                value={category.id}
                onChange={setTab}
              />
            </div>
            <h2 style={{ marginBottom: 4 }}>{category.heading}</h2>
            <p className="muted" style={{ marginBottom: 24 }}>{category.intro}</p>
            <ServiceList services={category.services} />
            {category.photos && (
              <div className={`photo-row ${category.photoShape === 'wide' ? 'photo-row--wide' : ''}`}>
                {category.photos.map((photo) => (
                  <img key={photo.src} className="photo" src={photo.src} alt={photo.alt} loading="lazy" />
                ))}
              </div>
            )}
            {category.id === 'systems' && (
              <p className="small muted" style={{ marginTop: 16 }}>
                Hair systems are sold separately. See the Hair Catalog for pricing.
              </p>
            )}
          </div>

          <aside className="policy">
            <h3>Before you book</h3>
            <ul>
              <li>All services are by appointment only.</li>
              <li>No card or deposit is needed to book; services are paid at the salon.</li>
              <li>Please cancel at least 12 hours ahead.</li>
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