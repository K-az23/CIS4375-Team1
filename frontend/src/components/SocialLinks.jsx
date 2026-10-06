import { business } from '../data/business';

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 3c.4 2.1 1.7 3.6 3.9 3.8v3.1c-1.4.1-2.7-.3-3.9-1.1v6.3c0 3.4-2.6 5.9-5.9 5.9S4.8 18.5 4.8 15.2c0-3.5 3-6.2 6.6-5.8v3.2c-1.7-.4-3.4.8-3.4 2.6 0 1.5 1.2 2.7 2.7 2.7s2.7-1.1 2.7-2.9V3h3.2z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9z" />
    </svg>
  );
}

export default function SocialLinks() {
  return (
    <div className="social">
      <a href={business.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon /></a>
      <a href={business.tiktokUrl} target="_blank" rel="noreferrer" aria-label="TikTok"><TikTokIcon /></a>
      <a href={business.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookIcon /></a>
    </div>
  );
}