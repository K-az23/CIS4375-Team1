import SpecList from './SpecList';
import { money } from '../data/sampleData';
import { orderStatuses, orderDate } from '../services/orders';

export default function OrderSummary({ order }) {
  // Use the saved order's specifications, rather than today's catalog defaults.
  const rows = [
    ['Order', `#${order.order_id}`],
    ...(order.catalog_product ? [['Product', order.catalog_product.item_name]] : []),
    ['System', order.system_label || order.order_type || 'Hairpiece'],
    ['Created', orderDate(order.placed_at)],
    ['Status', orderStatuses[order.order_status] || order.order_status],
    ['Amount', money(order.price)],
    ['Hair type', order.hair_type],
    ['Base type', order.base_type],
    ['Skin thickness', order.skin_type],
    ['Color', order.color_code],
    ['Grey percentage', order.grey_percentage == null ? '—' : `${order.grey_percentage}%`],
    ['Density', order.density],
    ['Dimensions', order.dimensions],
  ];
  if (order.customer) {
    rows.unshift(['Customer', `${order.customer.first_name} ${order.customer.last_name}`.trim()]);
    rows.unshift(['Email', order.customer.email]);
  }
  return <SpecList rows={rows.map(([label, value]) => [label, value ?? '—'])} />;
}
