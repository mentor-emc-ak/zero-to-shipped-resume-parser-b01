import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In production Vercel routes /api to the server; locally Vite does it.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})