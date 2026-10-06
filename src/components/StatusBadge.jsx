const variants = {
  Paid: 'success',
  Received: 'success',
  Completed: 'success',
  Confirmed: 'success',
  Active: 'success',
  'In stock': 'success',
  'On file': 'success',
  'Checked in': 'info',
  Ordered: 'gold',
  'Invoice sent': 'info',
  'Invoice due': 'warning',
  Pending: 'warning',
  Low: 'warning',
  'No card': 'warning',
  'No-show': 'danger',
  Restricted: 'danger',
  Out: 'danger',
};

export default function StatusBadge({ status }) {
  const variant = variants[status];
  return <span className={`badge ${variant ? `badge--${variant}` : ''}`}>{status}</span>;
}