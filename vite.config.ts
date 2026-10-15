import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    outDir: mode === 'offline' ? 'dist-offline' : 'dist',
    rollupOptions: { output: mode === 'offline' ? { inlineDynamicImports: true } : { manualChunks: { phaser: ['phaser'] } } },
  },
}));
