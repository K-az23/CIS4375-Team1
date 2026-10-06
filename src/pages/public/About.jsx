import { ArrowRight } from 'lucide-react';
import PageHero from '../../components/PageHero';
import FeatureStrip from '../../components/FeatureStrip';
import SectionHeader from '../../components/SectionHeader';
import GalleryGrid from '../../components/GalleryGrid';
import { business } from '../../data/business';
import { images } from '../../data/images';

const highlights = [
  { title: '25+ years', text: 'In the hair replacement industry' },
  { title: '10 years', text: 'In business in Cypress' },
  { title: 'Men & women', text: 'Hair system services for both' },
];

export default function About() {
  return (
    <>
      <PageHero eyebrow="About" title="The Executive Parlor" subtitle="Hair replacement and styling, by appointment." image={images.salonLounge} />

      <FeatureStrip items={highlights} />

      <section className="section">
        <div className="container split">
          <div>
            <SectionHeader eyebrow="Our mission" title="Helping every client look and feel their best" />
            <p>
              We provide high-quality, non-surgical hair replacement with expert application and
              personal care, in a private setting.
            </p>
            <p className="muted">
              With 25 years in the hair replacement industry and 10 years in business, The Executive
              Parlor serves clients across Cypress and the surrounding area.
            </p>
          </div>
          <img className="photo" src={images.stylist} alt="Stylist at The Executive Parlor" style={{ aspectRatio: '4 / 3', objectPosition: 'center 20%' }} />
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <div className="services-bar">
            <SectionHeader eyebrow="Gallery" title="Real people. Real results." />
            <a href={business.instagramUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
              More on Instagram <ArrowRight size={16} />
            </a>
          </div>
          <GalleryGrid
            items={[
              { image: images.mensFade, alt: "Men's fade haircut" },
              { image: images.womensCut, alt: "Women's cut and color" },
              { image: images.beardTrim, alt: 'Haircut and beard trim' },
              { image: images.mensCutProfile, alt: "Men's haircut, side view" },
            ]}
          />
        </div>
      </section>
    </>
  );
}