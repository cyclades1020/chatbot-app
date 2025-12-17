import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 根據環境變數決定建置模式
  build: process.env.BUILD_WIDGET === 'true' ? {
    // Widget 模式（用於建置可鑲嵌的 widget）
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
  } : {
    // 完整應用模式（預設，用於 Vercel 部署）
    outDir: 'dist',
    emptyOutDir: true
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

