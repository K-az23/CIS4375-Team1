import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// When no API address is supplied, forward /api requests to Flask.
// A VITE_API_URL setting can still point to another local port.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});