import { serviceCategories } from '../data/services';
import { money } from '../data/sampleData';

// Services live in Setmore and are synced into our database. The website keeps
// its own categories, photos and intros (data/services.js); this puts the
// synced services into those categories by name.

function toListItem(service) {
  return {
    name: service.service_name,
    price: Number(service.price) === 0 ? 'Free' : money(service.price),
    ...(service.duration_minutes ? { duration: `${service.duration_minutes} min` } : {}),
    ...(service.description ? { description: service.description } : {}),
  };
}

// Returns the categories to show. With no synced services yet (or the backend
// down), the local list is used so the page never goes empty.
export function groupServices(apiServices) {
  if (!apiServices?.length) return serviceCategories;

  const byName = new Map(apiServices.map((s) => [s.service_name.trim().toLowerCase(), s]));
  const used = new Set();

  const categories = serviceCategories
    .map((category) => {
      const services = category.services
        .map((local) => {
          const key = local.name.trim().toLowerCase();
          const synced = byName.get(key);
          if (!synced) return null;
          used.add(key);
          return toListItem(synced);
        })
        .filter(Boolean);
      return { ...category, services };
    })
    .filter((category) => category.services.length > 0);

  const others = apiServices.filter((s) => !used.has(s.service_name.trim().toLowerCase()));
  if (others.length) {
    categories.push({
      id: 'more',
      label: 'More',
      heading: 'More services',
      intro: 'Other services you can book.',
      services: others.map(toListItem),
    });
  }
  return categories;
}
