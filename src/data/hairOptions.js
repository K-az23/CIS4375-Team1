export const hairOptions = {
  hairType: ['Australian', 'Hollywood'],
  baseType: ['Skin', 'Lace'],
  skinThickness: ['Thin (.02mm)', 'Thick (.08mm)'],
  color: ['#1', '#2', '#3', '#4', '#5', '#6', '#7'],
  greyPercent: [0, 10, 20, 30, 40, 50, 60, 70, 80],
  density: ['Light', 'Medium', 'Heavy'],
  length: ['Short', 'Long'],
  dimensions: ['6 x 8', '7 x 9', '8 x 10'],
};

export const pricing = {
  areaSystem: 400, // hair-loss-area system ordered online
  longHairExtra: 0, // TODO: owner said long hair "may cost more" – set the amount once confirmed
  customFrom: 650, // full custom system (consultation + invoice)
  shippingDays: 10,
};

// Labels and help text for each option, in the order they are shown.
export const specFields = [
  { key: 'hairType', label: 'Hair type', hint: 'Hairpiece line.' },
  { key: 'baseType', label: 'Base type', hint: 'Skin or lace base.' },
  { key: 'skinThickness', label: 'Skin thickness', hint: 'Thin looks most natural; thick lasts longer.' },
  { key: 'color', label: 'Color', hint: '#1 is the darkest, #7 the lightest.' },
  { key: 'greyPercent', label: 'Grey percentage', hint: 'From 0% up to 80%.' },
  { key: 'density', label: 'Density', hint: 'How full the hair looks.' },
  { key: 'length', label: 'Hair length', hint: 'Long hair may cost more.' },
  { key: 'dimensions', label: 'Dimensions', hint: 'Size of the hair loss area, in inches.' },
];

// Shows "10%" for grey percentage, otherwise the value itself.
export function formatSpec(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  return key === 'greyPercent' ? `${value}%` : value;
}

// Approximate colors for the color swatches (#1 darkest → #7 lightest)
export const colorSwatches = {
  '#1': '#0b0b0b',
  '#2': '#1f1611',
  '#3': '#33241a',
  '#4': '#4a3324',
  '#5': '#634631',
  '#6': '#7d5c40',
  '#7': '#987654',
};