import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Keep the miden SDK unbundled so its WASM asset path stays valid in dev.
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  optimizeDeps: {
    // Keep Miden SDK unbundled and avoid prebundling Para's Stencil component bundles
    // to prevent multiple runtimes in dev.
    exclude: ['@demox-labs/miden-sdk'],
  },
  resolve: {
    dedupe: ['@getpara/web-sdk', '@getpara/react-sdk-lite'],
  },
  // Ensure Vite treats wasm as a static asset with the correct MIME type.
  assetsInclude: ['**/*.wasm'],
});
