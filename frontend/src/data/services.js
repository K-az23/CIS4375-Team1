import { images } from './images';


export const serviceCategories = [
  {
    id: 'systems',
    label: 'Hair Systems',
    heading: 'Hair systems',
    intro: 'Non-surgical hair replacement for men and women.',
    photoShape: 'wide',
    photos: [
      { src: images.beforeAfter1, alt: 'Hair system client before and after' },
      { src: images.beforeAfter2, alt: 'Hair system client before and after' },
    ],
    services: [
      {
        name: 'Hair Replacement Consultation',
        price: 'Free',
        description: 'Required before your first custom system. We review your hair loss area, match color and density, and take your order.',
      },
      {
        name: 'New System Cut-In, Application & Styling',
        price: '$150',
        duration: '75 min',
        description: 'Your new system is cut in, applied and styled in one visit.',
      },
      {
        name: 'Hair System Service',
        price: '$100',
        duration: '75 min',
        description: 'We remove your system, wash it, and re-apply it.',
      },
      {
        name: 'Hair System Service & Color',
        price: '$110',
        duration: '75 min',
        description: 'A full system service plus a color refresh.',
      },
      {
        name: 'Hair System Styling',
        price: '$50',
        description: 'Cut and style for a system that is already applied.',
      },
    ],
  },
  {
    id: 'men',
    label: "Men's",
    heading: "Men's services",
    intro: 'Cuts, color and grooming.',
    photos: [
      { src: images.mensFade, alt: "Men's fade haircut" },
      { src: images.beardTrim, alt: 'Haircut and beard trim' },
      { src: images.mensCutProfile, alt: "Men's haircut, side view" },
    ],
    services: [
      { name: "Men's Haircut", price: '$40', duration: '45 min' },
      { name: "Men's Color & Haircut", price: '$65' },
      { name: "Men's Haircut & Beard Trim", price: '$55', duration: '45 min' },
    ],
  },
  {
    id: 'women',
    label: "Women's",
    heading: "Women's services",
    intro: 'Cuts, color, root touch-ups and treatments. No highlights.',
    photos: [
      { src: images.womensCut, alt: "Women's cut and color" },
    ],
    services: [
      { name: 'Brazilian Blowout with Product Kit', price: '$365' },
      { name: 'Deep Condition, Haircut & Blow Dry', price: '$65' },
      { name: 'Deep Condition Treatment & Blowout', price: '$55' },
      { name: 'Root Touch-Up, Haircut & Blowout', price: '$105' },
      { name: 'Root Touch-Up & Blow Dry', price: '$95' },
      { name: 'Root Touch-Up', price: '$80' },
      { name: 'Color, Haircut & Blow Dry', price: '$120' },
      { name: 'Color & Blow Dry', price: '$80' },
      { name: 'Long Hair Charge', price: '$10' },
    ],
  },
];

export const allServices = serviceCategories.flatMap((c) => c.services);

export function priceToNumber(price) {
  const n = Number(String(price).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}