import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { 
    host: true,
    // Proxy: Redireciona /api para o teu servidor local
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // Aponta para o backend local
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api antes de enviar
      }
    }
  },
  plugins: [react()]
});