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
