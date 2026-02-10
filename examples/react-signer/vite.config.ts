import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { fileURLToPath } from 'url';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optionalConnectorsPath = path.resolve(
  __dirname,
  'src',
  'optional-connectors.ts'
);

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util'],
    }),
  ],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: [
      '@miden-sdk/miden-sdk',
      '@getpara/solana-wallet-connectors',
      '@getpara/cosmos-wallet-connectors',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [
        '@getpara/solana-wallet-connectors',
        '@getpara/cosmos-wallet-connectors',
      ],
    },
  },
  resolve: {
    dedupe: ['@getpara/web-sdk', '@getpara/react-sdk-lite', '@miden-sdk/miden-sdk', '@miden-sdk/react', '@tanstack/react-query', 'react', 'react-dom'],
    alias: {
      '@getpara/solana-wallet-connectors': optionalConnectorsPath,
      '@getpara/cosmos-wallet-connectors': optionalConnectorsPath,
      // Force a single copy of WASM-bearing packages.
      // With file: references each package gets its own node_modules copy;
      // without these aliases each copy loads a separate WASM instance,
      // causing "recursive use of an object" crashes.
      '@miden-sdk/miden-sdk': path.resolve(__dirname, 'node_modules', '@miden-sdk', 'miden-sdk'),
      '@miden-sdk/react': path.resolve(__dirname, 'node_modules', '@miden-sdk', 'react'),
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    fs: {
      allow: [
        process.cwd(),
        path.resolve(__dirname, '..', '..'),           // miden-para root
        path.resolve(__dirname, '..', '..', '..', 'miden-client'), // miden-client root
      ],
    },
  },
});
