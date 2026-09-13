import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Only an explicitly public browser key may be embedded in the Vite bundle.
        // Never map server-only GEMINI_API_KEY into client code.
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('scheduler')) {
                  return 'vendor-react';
                }
                if (id.includes('firebase')) {
                  return 'vendor-firebase';
                }
                if (id.includes('@google/genai')) {
                  return 'vendor-genai';
                }
                if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
                  return 'vendor-pdf-export';
                }
                if (id.includes('pdfjs-dist') || id.includes('mammoth') || id.includes('jszip')) {
                  return 'vendor-doc-parsers';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-icons';
                }
              }
            }
          }
        }
      }
    };
});
