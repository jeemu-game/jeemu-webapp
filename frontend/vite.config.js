import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const connectSubdomainPlugin = () => ({
  name: 'jeemu-connect-subdomain',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const host = req.headers.host || '';
      const url = req.url || '';
      if (
        host.startsWith('connect.') ||
        url === '/connect' ||
        url.startsWith('/connect?') ||
        url === '/connect/' ||
        url.startsWith('/connect/?')
      ) {
        req.url = '/connect.html';
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), connectSubdomainPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
