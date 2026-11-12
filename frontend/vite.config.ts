import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy de desarrollo: el navegador llama a /api/... en el mismo origen
    // que el frontend y Vite lo reenvía al backend (sin CORS, D62).
    //   /api/products → http://localhost:3000/products
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
