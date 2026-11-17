/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Node 22+ has its own experimental localStorage that shadows jsdom's
    // (and is broken without --localstorage-file). Turn it off in workers.
    execArgv: ['--no-experimental-webstorage'],
  },
})
