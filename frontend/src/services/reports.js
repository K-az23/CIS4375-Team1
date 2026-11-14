import { apiRequest } from './api';

const path = '/admin/reports';

// Keep the earlier helper available for code that only needs the stock summary.
export async function getInventoryReport({ signal } = {}) {
  const data = await apiRequest(`${path}/inventory`, { signal });
  return data.inventory;
}

// These helpers read reports. They do not change stock, customers or payments.
export async function getInventoryDetails(days, { signal } = {}) {
  const data = await apiRequest(`${path}/inventory?days=${days}`, { signal });
  if (!Array.isArray(data?.items) || !Number.isInteger(data.low_stock_count)) {
    throw new Error('The server returned an invalid inventory report.');
  }
  return data;
}

export async function getSalesReport(days, { signal } = {}) {
  const data = await apiRequest(`${path}/sales?days=${days}`, { signal });
  if (!Array.isArray(data?.days) || !Number.isFinite(data.total) ||
      data.days.some((day) => !Number.isFinite(day.value))) {
    throw new Error('The server returned an invalid sales report.');
  }
  return data;
}

export async function getCustomerSpending({ signal } = {}) {
  const data = await apiRequest(`${path}/customer-spending`, { signal });
  if (!Array.isArray(data?.customers) || !Number.isFinite(data.average_spend)) {
    throw new Error('The server returned an invalid customer spending report.');
  }
  return data;
}

export async function getMembershipReport({ signal } = {}) {
  const data = await apiRequest(`${path}/memberships`, { signal });
  if (!Array.isArray(data?.members) ||
      !['active_customers', 'active_members', 'inactive_members', 'non_members']
        .every((key) => Number.isInteger(data[key]) && data[key] >= 0)) {
    throw new Error('The server returned an invalid membership report.');
  }
  return data;
}
