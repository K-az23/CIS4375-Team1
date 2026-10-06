import { Link } from 'react-router-dom';
import { images } from '../data/images';

export default function Logo({ variant = 'gold' }) {
  return (
    <Link to="/" className="logo" aria-label="The Executive Parlor home">
      <img
        src={variant === 'gold' ? images.logoGold : images.logo}
        alt="The Executive Parlor – A Hair Restoration and Replacement Company"
        className="logo__img"
      />
    </Link>
  );
}