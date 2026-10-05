import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const apiProxy = {
  '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8102',
}

// The in-browser demo (VITE_DEMO=true) runs the server's own services, store and schemas.
const serverSrc = fileURLToPath(new URL('../server/src', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@server': serverSrc },
    dedupe: ['zod'],
  },
  server: { port: 5102, strictPort: true, proxy: apiProxy, fs: { allow: ['.', serverSrc] } },
  preview: { port: 5102, strictPort: true, proxy: apiProxy },
})
