import { apiRequest } from '../services/api';

export const ENDPOINTS = {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
};

export function api(path, options) {
    return apiRequest(path.replace(/^\/api(?=\/|$)/, ''), options);
}