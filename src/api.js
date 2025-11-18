import axios from 'axios';

// A API_URL agora aponta para /api
// Em produção (Vercel), isto vai para /api/products
// Em dev (local), o proxy do vite.config.js vai tratar disto
export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL
});

export function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
}