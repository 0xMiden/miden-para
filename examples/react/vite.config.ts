import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { fileURLToPath } from 'url';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optionalConnectorsPath = path.resolve(
  __dirname,
  'src',
  'optional-connectors.ts'
);

export default defineConfig({
  plugins: [
    tailwindcss(),
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
    dedupe: ['@getpara/web-sdk', '@getpara/react-sdk-lite'],
    alias: {
      '@getpara/solana-wallet-connectors': optionalConnectorsPath,
      '@getpara/cosmos-wallet-connectors': optionalConnectorsPath,
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    fs: {
      allow: [
        // allow your project
        process.cwd(),
      ],
    },
  },
  // ... other configurations
});
