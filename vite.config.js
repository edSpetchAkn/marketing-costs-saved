import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    rollupOptions: {
      input: 'src/main.js',
      output: {
        format: 'es',
        entryFileNames: 'marketing-costs-saved.js',
      },
    },
    outDir: 'dist',
    target: 'es2020',
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode !== 'production',
    terserOptions: {
      compress: {
        passes: 3,
        drop_console: false,
      },
    },
  },
}));
