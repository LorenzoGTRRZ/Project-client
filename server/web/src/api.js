import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.0.101:4000';

export const api = axios.create({
  baseURL: API_URL
});

export function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
}