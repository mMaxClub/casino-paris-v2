import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    // ✅ manualChunks simplificado (o elimínalo si no es necesario)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase') || id.includes('idb')) {
              return 'vendor';
            }
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});