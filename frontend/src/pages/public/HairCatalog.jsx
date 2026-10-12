import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import PageHero from '../../components/PageHero';
import SectionHeader from '../../components/SectionHeader';
import ChoiceGroup from '../../components/ChoiceGroup';
import SpecList from '../../components/SpecList';
import { hairOptions, pricing, specFields, formatSpec } from '../../data/hairOptions';
import { business } from '../../data/business';
import { images } from '../../data/images';

const emptySpecs = Object.fromEntries(specFields.map((f) => [f.key, null]));

export default function HairCatalog() {
  const navigate = useNavigate();
  const [specs, setSpecs] = useState(emptySpecs);
  const [agreed, setAgreed] = useState(false);

  const isComplete = specFields.every((f) => specs[f.key] !== null);
  const price = pricing.areaSystem;

  function choose(key, value) {
    setSpecs({ ...specs, [key]: value });
  }

  function goToReview() {
    navigate('/checkout', {
      state: { order: { title: 'Hair loss area system', specs, price } },
    });
  }

  return (
    <>
      <PageHero
        eyebrow="Hair Catalog"
        title="Order your hair system"
        subtitle={`Systems are made to order and arrive at the salon in about ${pricing.shippingDays} days.`}
        image={images.heroResult}
        imagePosition="center 10%"
      />

      <section className="section">
        <div className="container">
          <div className="saved-banner">
            <span><strong>Returning client?</strong> Your saved custom system can be re-ordered from your account.</span>
            <Link to="/account/hair-system" className="link-gold">Re-order my system <ArrowRight size={15} /></Link>
          </div>

          <div className="two-paths">
            <div className="option-card option-card--dark">
              <span className="eyebrow" style={{ color: 'var(--gold-light)' }}>First-time clients</span>
              <h3>Full custom system</h3>
              <div className="option-card__price">${pricing.customFrom}+<small>after consultation</small></div>
              <ul>
                <li><Check size={16} /> In-salon consultation to take your order</li>
                <li><Check size={16} /> You receive an invoice to pay online</li>
                <li><Check size={16} /> Saved to your account for re-ordering</li>
              </ul>
              <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">Book a consultation</a>
            </div>
            <div className="option-card">
              <span className="eyebrow">Order online</span>
              <h3>Hair loss area system</h3>
              <div className="option-card__price">${pricing.areaSystem}<small>per system</small></div>
              <ul>
                <li><Check size={16} /> Customize every option below</li>
                <li><Check size={16} /> Sizes 6 x 8, 7 x 9 or 8 x 10</li>
                <li><Check size={16} /> Pay securely online</li>
              </ul>
              <button
                className="btn btn-dark"
                onClick={() => document.getElementById('configure').scrollIntoView({ behavior: 'smooth' })}
              >
                Customize below
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--muted" id="configure">
        <div className="container">
          <SectionHeader eyebrow="Customize" title="Build your hair loss area system" />
          <div className="config">
            <div className="card">
              {specFields.map((field) => (
                <ChoiceGroup
                  key={field.key}
                  field={field}
                  options={hairOptions[field.key]}
                  value={specs[field.key]}
                  onChange={choose}
                />
              ))}
            </div>

            <aside className="card summary">
              <h3>Your system</h3>
              <SpecList rows={specFields.map((f) => [f.label, formatSpec(f.key, specs[f.key])])} />

              <div className="summary__price">
                <span>Total</span>
                <span className="summary__amount">${price}</span>
              </div>

              <label className="checkbox">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                I understand hair systems can't be returned once they're ordered from the vendor.
              </label>

              <button className="btn btn-dark btn-block" disabled={!isComplete || !agreed} onClick={goToReview}>
                Review &amp; pay <ArrowRight size={18} />
              </button>
              {!isComplete && <p className="field-hint">Choose an option in every row to continue.</p>}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}