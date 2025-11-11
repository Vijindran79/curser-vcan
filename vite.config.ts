import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cp } from 'fs/promises';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          output: {},
          external: [
            /^monaco-editor(.*)?$/,
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
              await cp('UI_UX_FIXES.css', 'dist/UI_UX_FIXES.css');
              // Copy service worker to dist
              await cp('sw.js', 'dist/sw.js');
              console.log('✓ Copied locales, src/locales, languages.json, UI_UX_FIXES.css, and sw.js to dist');
            } catch (error: any) {
              console.error('Error copying files:', error.message);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify('AIzaSyB1afKkTQE4iXpRLBxbLSDBvUfuI8Kl5SY'),
        'process.env.GEMINI_API_KEY': JSON.stringify('AIzaSyB1afKkTQE4iXpRLBxbLSDBvUfuI8Kl5SY'),
        'import.meta.env.VITE_GEOAPIFY_API_KEY': JSON.stringify('b0b098c3980140a9a8f6895c34f1bb29')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
