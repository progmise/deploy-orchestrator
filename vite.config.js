import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  // Dev: /api/* proxies to the local API — same-origin like prod, so the
  // session cookie stays SameSite=Lax and no CORS is needed.
  server: {
    proxy: {
      '/api': { target: process.env.API_UPSTREAM || 'http://localhost:8081', changeOrigin: false },
    },
  },
});
