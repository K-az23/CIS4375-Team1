// FAKE data so every page has something to show.

/*  Logged-in customer  */

export const currentCustomer = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '(555) 010-2030',
  status: 'Active',
  clientSince: 'Jan 2025',
  cardOnFile: { brand: 'Visa', last4: '4242', exp: '08/28' },
  savedSystem: {
    name: 'Custom hair system',
    price: 650,
    lastOrdered: 'Aug 22, 2026',
    specs: {
      hairType: 'Straight',
      baseType: 'Skin',
      skinThickness: 'Thin (.02mm)',
      color: '#2',
      greyPercent: 10,
      density: 'Medium',
      dimensions: '7 x 9',
    },
  },
};

export const nextAppointment = {
  date: 'Wed, Oct 7, 2026',
  time: '10:00 AM',
  service: 'Hair System Service',
};

export const customerAppointments = [
  { date: 'Sep 9, 2026', service: 'Hair System Service', status: 'Completed' },
  { date: 'Aug 26, 2026', service: 'New System Cut-In, Application & Styling', status: 'Completed' },
  { date: 'Aug 12, 2026', service: 'Hair Replacement Consultation', status: 'Completed' },
];

export const customerOrders = [
  { id: 'INV-1033', product: 'Custom hair system (re-order)', amount: 650, status: 'Invoice due', date: 'Oct 1, 2026' },
  { id: '#1024', product: 'Area system · 6 x 8', amount: 400, status: 'Ordered', date: 'Sep 12, 2026' },
  { id: '#1018', product: 'Custom hair system', amount: 650, status: 'Received', date: 'Aug 14, 2026' },
];

export const customerPayments = [
  { item: 'Area system order #1024', amount: 400, method: 'Visa •••• 4242', status: 'Paid', date: 'Sep 12, 2026' },
  { item: 'Hair System Service', amount: 100, method: 'Visa •••• 4242', status: 'Paid', date: 'Sep 9, 2026' },
  { item: 'New System Cut-In, Application & Styling', amount: 150, method: 'Cash', status: 'Paid', date: 'Aug 26, 2026' },
  { item: 'Custom hair system #1018', amount: 650, method: 'Visa •••• 4242', status: 'Paid', date: 'Aug 14, 2026' },
];

/*  Owner / admin  */

export const todaysAppointments = [
  { id: 'a1', time: '9:00 AM', customer: 'John Smith', services: ['Hair System Service'], status: 'Checked in', card: 'Visa •••• 4242' },
  { id: 'a2', time: '10:15 AM', customer: 'Marcus Lee', services: ["Men's Haircut"], status: 'Confirmed', card: 'Mastercard •••• 8810' },
  { id: 'a3', time: '11:00 AM', customer: 'Dana Ortiz', services: ['Root Touch-Up'], status: 'Confirmed', card: 'Visa •••• 1177' },
  { id: 'a4', time: '12:15 PM', customer: 'Robert King', services: ['Hair System Service & Color'], status: 'Confirmed', card: 'Amex •••• 3005' },
  { id: 'a5', time: '3:00 PM', customer: 'Alan Brooks', services: ['Hair Replacement Consultation'], status: 'Confirmed', card: 'Visa •••• 6620' },
];

export const hairOrders = [
  { id: 'INV-1033', customer: 'John Smith', type: 'Custom', specs: '#2 · 10% · Medium · 7 x 9', amount: 650, date: 'Oct 1, 2026', status: 'Invoice sent' },
  { id: '#1031', customer: 'Robert King', type: 'Area', specs: '#3 · 20% · Medium · 8 x 10', amount: 400, date: 'Sep 30, 2026', status: 'Pending' },
  { id: '#1030', customer: 'Alan Brooks', type: 'Custom', specs: '#1 · 0% · Heavy · 7 x 9', amount: 650, date: 'Sep 29, 2026', status: 'Pending' },
  { id: '#1024', customer: 'John Smith', type: 'Area', specs: '#2 · 10% · Medium · 6 x 8', amount: 400, date: 'Sep 12, 2026', status: 'Ordered' },
  { id: '#1018', customer: 'John Smith', type: 'Custom', specs: '#2 · 10% · Medium · 7 x 9', amount: 650, date: 'Aug 14, 2026', status: 'Received' },
];

let nextId = 1;
const item = (name, brand, category, type, qty, threshold, lastOrderQty) => ({
  id: nextId++, name, brand, category, type, qty, threshold, lastOrderQty, cost: null,
});

const demiShades = ['1N', '2N', '3N', '4N', '5N', '6N', '7N', '8N', '6A'];
const ruskShades = ['1N', '2N', '3N', '4N', '5N', '6N', '7N', '8N'];

export const inventoryItems = [
  item('Mighty Tight Ultra Hold Glue', 'Mighty Tight', 'Adhesive', 'per-use', 3, 2, 6),
  item('Ultra Hold Tape', 'Ultra Hold', 'Adhesive', 'per-use', 40, 20, 72),
  item('Poly Fuse Glue', 'Poly Fuse', 'Adhesive', 'per-use', 4, 2, 6),
  item('Disposable Gloves – Small', 'Generic', 'Supplies', 'per-use', 2, 4, 10),

  item('Kenra Shampoo', 'Kenra', 'Hair care', 'bulk', 5, 1, 6),
  item('Kenra Conditioner', 'Kenra', 'Hair care', 'bulk', 3, 1, 6),
  item('Kenra Hairspray', 'Kenra', 'Styling', 'bulk', 4, 1, 6),
  item('Kenra Mousse', 'Kenra', 'Styling', 'bulk', 1, 1, 4),
  item('Paul Mitchell Shampoo', 'Paul Mitchell', 'Hair care', 'bulk', 3, 1, 6),
  item('Paul Mitchell Conditioner', 'Paul Mitchell', 'Hair care', 'bulk', 2, 1, 6),

  ...demiShades.map((shade, i) => item(`Paul Mitchell The Demi ${shade}`, 'Paul Mitchell', 'Color', 'bulk', i === 5 ? 1 : 2, 1, 3)),
  ...ruskShades.map((shade, i) => item(`Rusk Color ${shade}`, 'Rusk', 'Color', 'bulk', i === 3 ? 0 : 2, 1, 3)),
];

export const usageHistory = {
  'John Smith|Hair System Service': [{ itemId: 1, qty: 1 }, { itemId: 2, qty: 4 }, { itemId: 4, qty: 2 }],
};
export const usualUsageByService = {
  'Hair System Service': [{ itemId: 1, qty: 1 }, { itemId: 2, qty: 3 }, { itemId: 4, qty: 2 }],
  'Hair System Service & Color': [{ itemId: 1, qty: 1 }, { itemId: 2, qty: 3 }, { itemId: 4, qty: 2 }],
  'New System Cut-In, Application & Styling': [{ itemId: 3, qty: 1 }, { itemId: 2, qty: 4 }, { itemId: 4, qty: 2 }],
};

export const customers = [
  { name: 'John Smith', email: 'john.smith@example.com', lastVisit: 'Sep 9, 2026', totalSpent: 1955, noShows: 0, card: true },
  { name: 'Marcus Lee', email: 'marcus.lee@example.com', lastVisit: 'Sep 16, 2026', totalSpent: 480, noShows: 1, card: true },
  { name: 'Dana Ortiz', email: 'dana.ortiz@example.com', lastVisit: 'Sep 2, 2026', totalSpent: 610, noShows: 0, card: true },
  { name: 'Robert King', email: 'robert.king@example.com', lastVisit: 'Aug 27, 2026', totalSpent: 900, noShows: 3, card: true },
  { name: 'Alan Brooks', email: 'alan.brooks@example.com', lastVisit: '—', totalSpent: 650, noShows: 0, card: false },
];

export const weeklySales = [
  { label: 'Wed', value: 980 },
  { label: 'Thu', value: 1420 },
  { label: 'Fri', value: 1105 },
  { label: 'Sat', value: 640 },
  { label: 'Wed', value: 860 },
  { label: 'Thu', value: 1245, today: true },
];

export function money(n) {
  if (n === null || n === undefined) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}