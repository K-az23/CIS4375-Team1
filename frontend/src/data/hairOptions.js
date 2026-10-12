export const hairOptions = {
  hairType: ['Wavy', 'Curly', 'Straight'],
  baseType: ['Skin', 'Lace'],
  skinThickness: ['Thin (.02mm)', 'Thick (.08mm)'],
  color: ['#1', '#2', '#3', '#4', '#5', '#6', '#7'],
  greyPercent: [0, 10, 20, 30, 40, 50, 60, 70, 80],
  density: ['Light', 'Medium', 'Heavy'],
  dimensions: ['6 x 8', '7 x 9', '8 x 10'],
};

export const pricing = {
  areaSystem: 400, 
  customFrom: 650, 
  shippingDays: 10,
};

export const specFields = [
  { key: 'hairType', label: 'Hair type', hint: 'The texture of the hair.' },
  { key: 'baseType', label: 'Base type', hint: 'Skin or lace base.' },
  { key: 'skinThickness', label: 'Skin thickness', hint: 'Thin looks most natural; thick lasts longer.' },
  { key: 'color', label: 'Color', hint: '#1 is the darkest, #7 the lightest.' },
  { key: 'greyPercent', label: 'Grey percentage', hint: 'From 0% up to 80%.' },
  { key: 'density', label: 'Density', hint: 'How full the hair looks.' },
  { key: 'dimensions', label: 'Dimensions', hint: 'Size of the hair loss area, in inches.' },
];

export function formatSpec(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  return key === 'greyPercent' ? `${value}%` : value;
}

export const colorSwatches = {
  '#1': '#0b0b0b',
  '#2': '#1f1611',
  '#3': '#33241a',
  '#4': '#4a3324',
  '#5': '#634631',
  '#6': '#7d5c40',
  '#7': '#987654',
};