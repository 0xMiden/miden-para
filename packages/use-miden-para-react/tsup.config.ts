import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  sourcemap: true,
  dts: true,
  clean: true,
  target: 'es2019',
  external: [
    'react',
    '@getpara/react-sdk-lite',
    '@miden-sdk/miden-para',
    '@demox-labs/miden-sdk',
  ],
});
