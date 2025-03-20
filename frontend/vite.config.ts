import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin"
    },
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      allow: ['.']
    },
    middlewareMode: false
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true
  }
});
