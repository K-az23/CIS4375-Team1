import { serviceCategories } from '../data/services';
import { money } from '../data/sampleData';

// Services live in Setmore and are synced into our database. The website keeps
// its own categories, photos and intros (data/services.js); this puts the
// synced services into those categories by name.

// Website name -> the name the service has in Setmore. Setmore's wording
// differs ("Mens Haircut" vs "Men's Haircut"), so matching is done through this.
const SETMORE_NAMES = {
  'Hair Replacement Consultation': 'Consultation',
  'New System Cut-In, Application & Styling': 'Cut-In Personal System',
  'Hair System Service': 'System Service',
  'Hair System Service & Color': 'System Service & Color',
  'Hair System Styling': 'System Styling',
  "Men's Haircut": 'Mens Haircut',
  "Men's Color & Haircut": 'Mens Color and Haircut',
  "Men's Haircut & Beard Trim": 'Mens Haircut & Beard Trim',
  'Brazilian Blowout with Product Kit': 'Brazilian Blowout w/Product Kit',
  'Deep Condition, Haircut & Blow Dry': 'Womens Deep Condition, Haircut & Blow Dry',
  'Deep Condition Treatment & Blowout': 'Womens Deep Condition Treatment & Blow Out',
  'Root Touch-Up, Haircut & Blowout': 'Womens Root TouchUp, Haircut & Blow Dry',
  'Root Touch-Up & Blow Dry': 'Womens Root TouchUp & Blow Dry',
  'Root Touch-Up': 'Womens Root Touch Up',
  'Color, Haircut & Blow Dry': 'Womens Color, Haircut & Blow Dry',
  'Color & Blow Dry': 'Womens Color and Blow Dry',
};

// Setmore services the website doesn't list go into the closest category by name.
function categoryFor(setmoreName) {
  const name = setmoreName.toLowerCase();
  if (name.includes('system')) return 'systems';
  if (name.startsWith('mens')) return 'men';
  if (name.startsWith('womens')) return 'women';
  return null;
}

const normalize = (name) => name.trim().toLowerCase();

// Keeps the website's wording for the name; price, length and description come from Setmore.
function toListItem(service, displayName = service.service_name) {
  return {
    name: displayName,
    price: Number(service.price) === 0 ? 'Free' : money(service.price),
    ...(service.duration_minutes ? { duration: `${service.duration_minutes} min` } : {}),
    ...(service.description ? { description: service.description } : {}),
  };
}

// Returns the categories to show. With no synced services yet (or the backend
// down), the local list is used so the page never goes empty.
export function groupServices(apiServices) {
  if (!apiServices?.length) return serviceCategories;

  const byName = new Map(apiServices.map((s) => [normalize(s.service_name), s]));
  const used = new Set();

  const categories = serviceCategories.map((category) => {
    const services = category.services
      .map((local) => {
        const key = normalize(SETMORE_NAMES[local.name] ?? local.name);
        const synced = byName.get(key);
        if (!synced) return null;
        used.add(key);
        return toListItem(synced, local.name);
      })
      .filter(Boolean);
    return { ...category, services };
  });

  const others = [];
  for (const service of apiServices) {
    if (used.has(normalize(service.service_name))) continue;
    const category = categories.find((c) => c.id === categoryFor(service.service_name));
    if (category) category.services.push(toListItem(service));
    else others.push(service);
  }

  const shown = categories.filter((category) => category.services.length > 0);
  if (others.length) {
    shown.push({
      id: 'more',
      label: 'More',
      heading: 'More services',
      intro: 'Other services you can book.',
      services: others.map((s) => toListItem(s)),
    });
  }
  return shown;
}