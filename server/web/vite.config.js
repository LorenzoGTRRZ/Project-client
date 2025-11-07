import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { 
    host: true,
    // Adicione este proxy:
    proxy: {
      // Qualquer chamada para /auth, /products, etc.
      // será redirecionada para o seu backend no localhost:4000
      '/auth': 'http://localhost:4000',
      '/categories': 'http://localhost:4000',
      '/products': 'http://localhost:4000',
      '/orders': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    }
  },
  plugins: [react()]
});