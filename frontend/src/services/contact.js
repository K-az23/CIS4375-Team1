import { apiRequest } from './api';

// Keep the readable choices on the page and send Flask's expected codes.
const reasonCodes = {
  'General question': 'general_question',
  'Hair replacement consultation': 'hair_replacement_consultation',
  'Hair system order': 'hair_system_order',
  'Appointment question': 'appointment_question',
  Memberships: 'membership',
};

export async function submitContact(fields) {
  const result = await apiRequest('/contact', {
    method: 'POST',
    body: {
      full_name: fields.name.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      reason: reasonCodes[fields.reason] || fields.reason,
      message: fields.message.trim(),
    },
  });

  // Do not treat an unexpected response as a successful submission.
  if (result?.success !== true) {
    throw new Error(
      'The server did not confirm your message. Please try again.'
    );
  }

  return result;
}

// Display field errors using the same labels visitors see on the form.
export function contactError(error) {
  const labels = {
    full_name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    reason: 'Reason',
    message: 'Message',
  };

  const details = Object.entries(error.details || {})
    .filter(([, value]) => typeof value === 'string')
    .map(([field, value]) =>
      `${labels[field] || field}: ${value}`
    );

  return details.length ? details.join(' ') : error.message;
}