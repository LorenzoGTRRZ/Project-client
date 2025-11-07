import axios from 'axios';

// 1. A API_URL agora é relativa.
// Em produção (Vercel), ela vai chamar /products, /categories, etc.
// O vercel.json vai redirecionar isso para o backend.
export const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL
});

export function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
}