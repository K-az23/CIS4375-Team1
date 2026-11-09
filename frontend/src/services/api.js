const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
    .replace(/\/+$/, '');

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('token');

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
    });

    if (response.status === 204) {
        return null;
    }

    // Read the body outside the JSON parse so cancellation still propagates.
    const responseBody = await response.text();
    let data;

    try {
        data = JSON.parse(responseBody);
    } catch {
        if (response.ok) {
            throw new Error('The server returned an unexpected response.');
        }
    }

    if (!response.ok) {
        const message = response.status >= 500
            ? 'The server is having trouble. Please try again later.'
            : data?.error || data?.message || data?.msg ||
                `The request failed (${response.status}).`;

        const error = new Error(message);
        error.status = response.status;
        error.details = data?.details;
        throw error;
    }

    return data;
}