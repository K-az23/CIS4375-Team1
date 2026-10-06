import { Link } from 'react-router-dom';
import { ArrowRight, Check, Scissors, CalendarCheck, Package, ShieldCheck } from 'lucide-react';
import FeatureStrip from '../../components/FeatureStrip';
import SectionHeader from '../../components/SectionHeader';
import CTABanner from '../../components/CTABanner';
import { business } from '../../data/business';
import { pricing } from '../../data/hairOptions';
import { images } from '../../data/images';

const features = [
  { icon: ShieldCheck, title: '25+ years', text: 'Experience in hair replacement' },
  { icon: Scissors, title: 'Men & women', text: 'Hair systems, cuts and color' },
  { icon: Package, title: 'Order online', text: 'Re-order your system any time' },
  { icon: CalendarCheck, title: 'By appointment', text: 'Book online in minutes', href: business.bookingUrl },
];

const categories = [
  { title: 'Hair systems', text: 'Consultations, new system application and regular maintenance.', to: '/services', image: images.beforeAfter1 },
  { title: "Men's services", text: 'Cuts, color and beard trims.', to: '/services', image: images.beardTrim },
  { title: "Women's services", text: 'Cuts, color, root touch-ups and treatments.', to: '/services', image: images.womensCut },
];

const customSteps = [
  { title: 'Consultation', text: 'Meet in the salon. We review your hair loss area and goals.' },
  { title: 'Your order', text: 'We record color, grey %, base, density and dimensions.' },
  { title: 'Invoice', text: 'You receive an invoice and pay online.' },
  { title: 'Ordered', text: `Your system arrives in about ${pricing.shippingDays} days.` },
  { title: 'Application', text: 'Cut-in, application and styling in one visit.' },
];

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="container home-hero__grid">
          <div>
            <span className="eyebrow">Cypress, Texas</span>
            <h1>Non-surgical hair replacement, done right.</h1>
            <p>
              Natural-looking hair systems and expert styling from a specialist with 25 years in the
              industry. Private, appointment-only service.
            </p>
            <div className="home-hero__actions">
              <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">
                Book a consultation <ArrowRight size={18} />
              </a>
              <Link to="/services" className="btn btn-ghost-light">View services</Link>
            </div>
          </div>
          <div
            className="home-hero__image"
            role="img"
            aria-label="Smiling client after his hair system service"
            style={{ backgroundImage: `url(${images.heroResult})` }}
          />
        </div>
      </section>

      <FeatureStrip items={features} />

      <section className="section">
        <div className="container">
          <SectionHeader eyebrow="Services" title="What we offer" text="Hair replacement for men and women, plus everyday cuts and color." />
          <div className="category-grid">
            {categories.map((c) => (
              <Link key={c.title} to={c.to} className="category-card">
                <div className="category-card__image" role="img" aria-label={c.title} style={{ backgroundImage: `url(${c.image})` }} />
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <span className="link-gold">See prices <ArrowRight size={15} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <SectionHeader eyebrow="Hair systems" title="Two ways to get your hair system" />
          <div className="two-paths">
            <div className="option-card option-card--dark">
              <span className="eyebrow" style={{ color: 'var(--gold-light)' }}>First-time clients</span>
              <h3>Full custom system</h3>
              <div className="option-card__price">${pricing.customFrom}+<small>after consultation</small></div>
              <ul>
                <li><Check size={16} /> Starts with an in-salon consultation</li>
                <li><Check size={16} /> Built to your exact specifications</li>
                <li><Check size={16} /> Saved to your account for easy re-ordering</li>
              </ul>
              <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">
                Book a consultation
              </a>
            </div>
            <div className="option-card">
              <span className="eyebrow">Order online</span>
              <h3>Hair loss area system</h3>
              <div className="option-card__price">${pricing.areaSystem}<small>per system</small></div>
              <ul>
                <li><Check size={16} /> Choose color, grey %, base, density and size</li>
                <li><Check size={16} /> Pay securely online</li>
                <li><Check size={16} /> Arrives in about {pricing.shippingDays} days</li>
              </ul>
              <Link to="/hair-catalog" className="btn btn-dark">Customize yours</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeader eyebrow="How it works" title="Your custom system, step by step" />
          <div className="steps">
            {customSteps.map((step, i) => (
              <div key={step.title} className="step">
                <div className="step__num">0{i + 1}</div>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <SectionHeader eyebrow="Results" title="Real people. Real results." text="Before and after a non-surgical hair system." />
          <div className="results-grid">
            <figure>
              <img className="photo" src={images.beforeAfter1} alt="Client before and after his hair system" loading="lazy" />
            </figure>
            <figure>
              <img className="photo" src={images.beforeAfter2} alt="Client before and after his hair system" loading="lazy" />
            </figure>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <CTABanner
            eyebrow="Get started"
            title="Your hair. Your confidence."
            text="Book a free consultation and we'll find the right solution for you."
            buttonLabel="Book now"
            href={business.bookingUrl}
          />
        </div>
      </section>
    </>
  );
}