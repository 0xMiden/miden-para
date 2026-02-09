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

// Optional connector families that are never imported by the starter template.
// Alias them to an empty module so Vite doesn't try to resolve their deps.
const optionalPackages = [
  '@getpara/solana-wallet-connectors',
  '@getpara/cosmos-wallet-connectors',
  '@getpara/wagmi-v2-connector',
  'wagmi',
  '@wagmi/core',
  '@wagmi/connectors',
];

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
      '@miden-sdk/miden-sdk',
      ...optionalPackages,
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: optionalPackages,
    },
  },
  worker: {
    format: 'es',
  },
  resolve: {
    dedupe: ['@getpara/web-sdk', '@getpara/react-sdk-lite', 'react', 'react-dom'],
    alias: Object.fromEntries(
      optionalPackages.map((pkg) => [pkg, optionalConnectorsPath])
    ),
  },
  // Ensure Vite treats wasm as a static asset with the correct MIME type.
  assetsInclude: ['**/*.wasm'],
  server: {
    fs: {
      allow: [process.cwd()],
    },
  },
});
