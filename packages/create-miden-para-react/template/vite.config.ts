import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optionalConnectorsPath = path.resolve(
  __dirname,
  'src',
  'optional-connectors.ts'
);

// Keep the miden SDK unbundled so its WASM asset path stays valid in dev.
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util'],
    }),
  ],
  optimizeDeps: {
    // Keep Miden SDK unbundled and avoid prebundling Para's Stencil component bundles
    // to prevent multiple runtimes in dev.
    exclude: [
      '@demox-labs/miden-sdk',
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
  worker: {
    format: 'es',
  },
  resolve: {
    dedupe: ['@getpara/web-sdk', '@getpara/react-sdk-lite'],
    alias: {
      '@getpara/solana-wallet-connectors': optionalConnectorsPath,
      '@getpara/cosmos-wallet-connectors': optionalConnectorsPath,
    },
  },
  // Ensure Vite treats wasm as a static asset with the correct MIME type.
  assetsInclude: ['**/*.wasm'],
  server: {
    fs: {
      allow: [process.cwd()],
    },
  },
});
