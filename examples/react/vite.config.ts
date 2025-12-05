import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Keep the miden SDK unbundled so its WASM asset path stays valid in dev.
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  optimizeDeps: {
    exclude: ["@demox-labs/miden-sdk"],
  },
  // Ensure Vite treats wasm as a static asset with the correct MIME type.
  assetsInclude: ["**/*.wasm"],
});