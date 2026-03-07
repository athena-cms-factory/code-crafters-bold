import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5002,
    host: true,
    allowedHosts: true // Cruciaal voor Vite 6 op Chromebooks
  }
})
