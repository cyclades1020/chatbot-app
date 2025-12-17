import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/widget.jsx',
      name: 'ChatbotWidget',
      fileName: 'chatbot-widget',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'chatbot-widget.js',
        assetFileNames: 'chatbot-widget.css'
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

