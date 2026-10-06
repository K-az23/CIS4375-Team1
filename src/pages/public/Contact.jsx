import { useState } from 'react';
import { ArrowRight, MapPin, Mail, Clock, MessageSquare, Check } from 'lucide-react';
import PageHero from '../../components/PageHero';
import SocialLinks from '../../components/SocialLinks';
import { business } from '../../data/business';
import { images } from '../../data/images';

const reasons = [
  'General question',
  'Hair replacement consultation',
  'Hair system order',
  'Appointment question',
  'Memberships',
];

const emptyForm = { name: '', email: '', phone: '', reason: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [sent, setSent] = useState(false);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    setForm(emptyForm);
  }

  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch" subtitle="Questions about hair systems, services or an order? Leave a message and we'll reply by text or email." image={images.reserveLobby} />

      <section className="section">
        <div className="container">
          <div className="contact">
            <div className="card">
              <div className="stack" style={{ gap: 6, marginBottom: 24 }}>
                <span className="eyebrow">Send a message</span>
                <h2>We'd love to hear from you</h2>
              </div>

              {sent && <p className="notice" style={{ marginBottom: 16 }}><Check size={16} /> Message sent. We'll get back to you shortly.</p>}

              <form className="form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="name">Full name *</label>
                    <input id="name" name="name" required value={form.name} onChange={update} />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email address *</label>
                    <input id="email" name="email" type="email" required value={form.email} onChange={update} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input id="phone" name="phone" type="tel" value={form.phone} onChange={update} />
                  </div>
                  <div className="field">
                    <label htmlFor="reason">Reason *</label>
                    <select id="reason" name="reason" required value={form.reason} onChange={update}>
                      <option value="" disabled>Select an option</option>
                      {reasons.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="message">Message *</label>
                  <textarea id="message" name="message" required maxLength={500} value={form.message} onChange={update} />
                  <span className="field-hint" style={{ textAlign: 'right' }}>{form.message.length}/500</span>
                </div>
                <div>
                  <button type="submit" className="btn btn-dark">Send message <ArrowRight size={18} /></button>
                </div>
              </form>
            </div>

            <aside className="contact__info">
              <div className="info-item">
                <span className="icon-circle"><MapPin size={17} /></span>
                <div>
                  <h4>Location</h4>
                  <p>{business.addressLine1}<br />{business.addressLine2}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="icon-circle"><Mail size={17} /></span>
                <div>
                  <h4>Email</h4>
                  <p>{business.email}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="icon-circle"><Clock size={17} /></span>
                <div>
                  <h4>Hours</h4>
                  {business.hours.map((h) => <p key={h.days}>{h.days}: {h.time}</p>)}
                </div>
              </div>
              <div className="info-item">
                <span className="icon-circle"><MessageSquare size={17} /></span>
                <div>
                  <h4>Prefer a text?</h4>
                  <p>Add your phone number to the form and we'll text you back.</p>
                </div>
              </div>
              <div>
                <h4 style={{ marginBottom: 10 }}>Follow us</h4>
                <SocialLinks />
              </div>
            </aside>
          </div>

          <div className="find-us">
            <img className="photo" src={images.reserveSign} alt="Reserve Salon and Spa sign in the building lobby" loading="lazy" />
            <div className="stack">
              <span className="eyebrow">Finding us</span>
              <h2>We're inside Reserve Salon and Spa</h2>
              <p className="muted">
                Come in through the Reserve Salon and Spa entrance and head to Suite 200, Room 53.
              </p>
              <p>{business.addressLine1}<br />{business.addressLine2}</p>
              <div>
                <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-dark">
                  Get directions <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}