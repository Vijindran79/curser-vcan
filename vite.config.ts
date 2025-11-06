import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cp } from 'fs/promises';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'monaco-editor': ['monaco-editor']
            }
          },
          external: [
            /^backup-/,
            /^hip--main/
          ]
        },
        chunkSizeWarningLimit: 1000
      },
      plugins: [
        react(),
        {
          name: 'copy-locales',
          async writeBundle() {
            try {
              await cp('locales', 'dist/locales', { recursive: true });
              await cp('src/locales', 'dist/src/locales', { recursive: true });
              await cp('locales.json', 'dist/locales.json');
              await cp('languages.json', 'dist/languages.json');
              // Copy service worker to dist
              await cp('sw.js', 'dist/sw.js');
              console.log('✓ Copied locales, src/locales, languages.json, and sw.js to dist');
            } catch (error: any) {
              console.error('Error copying files:', error.message);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
