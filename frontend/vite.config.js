
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: '0.0.0.0',
    port: 5173,

    // Permite o acesso pelo domínio público do Cloudflare
    allowedHosts: [
      'reef-request-trails-stood.trycloudflare.com',
    ],

    // Encaminha as requisições da API para o backend
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
