import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Path relatif supaya hasil build bisa dibuka di GitHub Pages
  // (https://<username>.github.io/fleet-maintenance-dashboard/)
  base: './',
  build: { chunkSizeWarningLimit: 800 }, // Recharts cukup besar; aman untuk dashboard
});
