import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname),
  envDir: resolve(__dirname, '..'),
  publicDir: resolve(__dirname, '../assets'),
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../src/shared'),
      '@hub': resolve(__dirname, '../src/hub'),
      '@api': resolve(__dirname, '../src/api')
    }
  },
  server: {
    port: 5174,
    open: true
  },
  build: {
    outDir: resolve(__dirname, '../dist-web'),
    emptyOutDir: true
  }
})
