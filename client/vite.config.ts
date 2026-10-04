import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiProxy = {
  '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8102',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5102, strictPort: true, proxy: apiProxy },
  preview: { port: 5102, strictPort: true, proxy: apiProxy },
})
