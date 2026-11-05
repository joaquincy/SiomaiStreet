import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'menu-image-case-normalizer',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Normalize case for menu images so dev server serves reliably
          if (req.url && req.url.startsWith('/images/menu/')) {
            req.url = req.url.replace('/images/menu/', '/images/Menu/');
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  }
})
