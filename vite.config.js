import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, HTTP API calls and uploads use the Vite proxy. Socket.IO connects directly to Express
// because its credentialed CORS configuration already allows the client origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
