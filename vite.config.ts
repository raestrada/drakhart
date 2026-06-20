import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    'CANVAS_RENDERER': JSON.stringify(true),
    'WEBGL_RENDERER': JSON.stringify(true)
  },
  build: {
    target: 'es2020',
  },
});
