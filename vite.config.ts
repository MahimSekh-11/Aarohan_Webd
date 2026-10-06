import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build:{rollupOptions:{output:{manualChunks(id){
      if(/node_modules\/(?:motion|framer-motion|motion-dom|motion-utils)\//.test(id.replace(/\\/g,'/')))return 'motion';
      if(/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler)\//.test(id.replace(/\\/g,'/')))return 'framework';
    }}}},
    optimizeDeps: {
      exclude: ['@xenova/transformers', 'wavefile', 'multer', 'onnxruntime-node', 'express', 'mongoose', 'mongodb-memory-server']
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3000'
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
