import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // actions/configure-pages provides BASE_PATH (e.g. "/screenrec"); locally unset → "/".
  base: `${process.env.BASE_PATH ?? ''}/`,
  server: {
    port: 8080,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
