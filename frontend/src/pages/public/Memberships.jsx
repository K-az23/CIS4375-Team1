import { Link } from 'react-router-dom';
import PageHero from '../../components/PageHero';
import SectionHeader from '../../components/SectionHeader';
import { business } from '../../data/business';
import { images } from '../../data/images';

export default function Memberships() {
  return (
    <>
      <PageHero eyebrow="Memberships" title="Memberships" subtitle="Ask about membership options at your next visit." />

      <section className="section">
        <div className="container split">
          <div>
            <SectionHeader eyebrow="In person" title="Arranged at the salon" />
            <p>
              Memberships are set up directly with us, so we can match them to your hair system and
              how often you come in.
            </p>
            <p className="muted">Ask during your next appointment, or send us a message and we'll follow up.</p>
            <div className="row" style={{ marginTop: 28 }}>
              <Link to="/contact" className="btn btn-dark">Send us a message</Link>
              <a href={business.bookingUrl} target="_blank" rel="noreferrer" className="btn btn-outline">Book an appointment</a>
            </div>
          </div>
          <img className="photo" src={images.reserveLobby} alt="Lobby of Reserve Salon and Spa" style={{ aspectRatio: '4 / 3' }} />
        </div>
      </section>
    </>
  );
}