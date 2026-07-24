import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // jspdf + jspdf-autotable are dynamically imported by
        // utils/pdfExport.ts (see PR #136), so they and their optional
        // deps (html2canvas, dompurify, and jsPDF's own core-js/fflate
        // polyfill chunk) only ever load on the Export PDF click. Rollup
        // already isolates each into its own chunk reachable only from
        // pdfExport's dynamic import (verified via chunk-import grep: no
        // other chunk references them) — precaching them upfront would
        // defeat the point of that dynamic import, so exclude them by
        // their stable auto-generated chunk-name prefixes. Deliberately
        // NOT using manualChunks to force them into one named chunk:
        // doing so pulled Vite's shared `__vitePreload` runtime helper
        // into that chunk, which made every other route eagerly import
        // it on load — a regression, not a fix. Plain per-package
        // globIgnores has no such side effect.
        globIgnores: [
          '**/pdfExport-*.js',
          '**/html2canvas-*.js',
          '**/purify.es-*.js',
          '**/index.es-*.js',
        ],
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
  test: {
    globals: true,
    testTimeout: 60000,
    // Keep Windows from oversubscribing workers while the generated
    // curriculum chunks are transformed. Higher automatic concurrency made
    // otherwise-green route effects miss their async assertion windows.
    maxWorkers: 4,
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
          setupFiles: ['src/test/setup.ts'],
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
