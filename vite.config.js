import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // treat upper-case image extensions (e.g. .JPG from iPhones) as assets
  assetsInclude: ['**/*.JPG', '**/*.JPEG', '**/*.PNG', '**/*.WEBP', '**/*.HEIC'],
  server: {
    host: true, // expose on LAN so you can test on a real iPhone
  },
})
