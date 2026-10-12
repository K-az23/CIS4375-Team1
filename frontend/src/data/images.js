// Photos live in the S3 bucket. Set VITE_IMAGE_BASE_URL in the .env file, e.g.
//   VITE_IMAGE_BASE_URL=https://your-bucket.s3.us-east-2.amazonaws.com/images
const BASE = (import.meta.env.VITE_IMAGE_BASE_URL || '/images').replace(/\/$/, '');
const img = (file) => `${BASE}/${file}`;

export const images = {
  logoGold: img('logo-gold.png'), 
  logo: img('logo.png'), 

  heroResult: img('hero-hair-system-result.jpg'),
  beforeAfter1: img('before-after-1.jpg'),
  beforeAfter2: img('before-after-2.jpg'),
  stylist: img('stylist.jpg'),

  salonChair: img('salon-chair.jpg'),
  salonLounge: img('salon-lounge.jpg'),
  reserveSign: img('reserve-sign.jpg'),
  reserveLobby: img('reserve-lobby.jpg'),

  mensFade: img('mens-fade.jpg'),
  mensCutProfile: img('mens-cut-profile.jpg'),
  beardTrim: img('beard-trim.jpg'),
  womensCut: img('womens-cut.jpg'),
};