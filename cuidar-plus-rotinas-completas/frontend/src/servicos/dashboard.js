import { apiRequest } from './api.js';
export const obterDashboard = (token, periodo) => apiRequest(`/api/dashboard?periodo=${encodeURIComponent(periodo)}`, {token});
