// Get the backend address from the frontend .env file.
const baseUrl = import.meta.env.VITE_API_URL;

export async function apiRequest(path, options = {}) {
    // Use GET unless the caller chooses another method.
    const method = options.method || 'GET';
    const body = options.body;

    const headers = {
        Accept: 'application/json',
    };

    // Turn any data being sent into JSON.
    let requestBody;

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
    }

    // Send the request. The signal lets a page cancel it if needed.
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: requestBody,
        signal: options.signal,
    });

    // Read the JSON returned by the backend.
    let data = null;

    try {
        data = await response.json();
    } catch {
        // Some responses do not include JSON.
    }

    // Pass failed requests back to the page with a useful message.
    if (!response.ok) {
        let message = 'The request failed. Please try again.';

        if (data && data.error) {
        message = data.error;
        }

        if (response.status >= 500) {
        message = 'The server is having trouble. Please try again later.';
        }

        const error = new Error(message);
        error.status = response.status;

        // Keep field errors so forms can show what needs fixing.
        if (data && data.details) {
        error.details = data.details;
        }

        throw error;
    }

    // A 204 response is allowed to have no data.
    if (response.status !== 204 && data === null) {
        throw new Error('The server returned an unexpected response.');
    }

    // Give the result back to the page.
    return data;
}