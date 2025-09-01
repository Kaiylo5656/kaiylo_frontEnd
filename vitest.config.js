/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.jsx'],
    // you might want to disable CSS modules for testing
    css: false,
    // Set global test timeout to 20 seconds
    testTimeout: 20000,
  },
});
