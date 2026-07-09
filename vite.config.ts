import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// jspdf + jspdf-autotable are dynamically imported by utils/pdfExport.ts
// (see PR #136) so they, and their transitive/optional deps (html2canvas,
// dompurify, fflate/fast-png, canvg + its core-js polyfill) that jsPDF's
// .html() plugin pulls in, only ever load on the Export PDF click. Force
// them into one stably-named chunk so the PWA precache list
// (workbox.globIgnores below) can exclude them without depending on
// Rollup's auto-generated per-package chunk names/hashes.
const PDF_EXPORT_VENDOR_CHUNK = 'pdf-export-vendor';
const pdfExportVendorPattern = /[\\/]node_modules[\\/](jspdf|jspdf-autotable|html2canvas|dompurify|fflate|fast-png|canvg|core-js)[\\/]/;

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // Don't precache the PDF export vendor bundle or the pdfExport
        // util itself — they're loaded on demand from SessionsPage's
        // Export PDF action, and precaching them defeats the point of
        // dynamic-importing them.
        globIgnores: [`**/${PDF_EXPORT_VENDOR_CHUNK}-*.js`, '**/pdfExport-*.js'],
      },
      manifest: {
        name: 'Poker Analyzer',
        short_name: 'PokerAnalyzer',
        description: 'Private local generic poker hand analyzer',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (pdfExportVendorPattern.test(id)) {
            return PDF_EXPORT_VENDOR_CHUNK;
          }
        },
      },
    },
  },
  test: {
    globals: true,
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/types/**',
      ],
      thresholds: {
        lines: 70,
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.path/**',
      '**/.git/**',
      '**/.cache/**',
      '**/.claude/**'
    ],
    // Parser/analysis/data/utils suites are pure Node (they self-import
    // `fake-indexeddb/auto` and touch no DOM); only component/page/hook tests
    // need jsdom. Splitting avoids booting jsdom for the majority of files.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'src/parser/**/*.test.{ts,tsx}',
            'src/analysis/**/*.test.{ts,tsx}',
            'src/data/**/*.test.{ts,tsx}',
            'src/utils/**/*.test.{ts,tsx}',
            'scripts/**/*.test.{ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.git/**',
            '**/.cache/**',
            '**/.claude/**',
            'src/parser/**',
            'src/analysis/**',
            'src/data/**',
            'src/utils/**',
          ],
        },
      },
    ],
  },
});
