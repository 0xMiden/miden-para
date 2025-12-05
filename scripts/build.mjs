import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

const entryPoints = await glob('src/**/*.{ts,tsx,js,jsx}');

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const buildTargets = [
  {
    dir: 'esm',
    format: 'esm',
    packageJson: { type: 'module', sideEffects: false },
    splitting: true
  },
  {
    dir: 'cjs',
    format: 'cjs',
    packageJson: { type: 'commonjs' },
    splitting: false
  }
];

/** @type {Omit<import('esbuild').BuildOptions, 'format' | 'outdir' | 'splitting'>} */
const sharedOptions = {
  bundle: false,
  write: true,
  loader: {
    '.json': 'text'
  },
  platform: 'browser',
  entryPoints,
  allowOverwrite: true,
  minify: false,
  target: ['es2022'],
  packages: 'external'
};

for (const target of buildTargets) {
  const outDir = path.join(distDir, target.dir);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'package.json'),
    JSON.stringify(target.packageJson, null, 2)
  );

  /** @type {import('esbuild').BuildOptions} */
  const buildOptions = {
    ...sharedOptions,
    format: target.format,
    splitting: target.splitting,
    outdir: outDir
  };

  await esbuild.build(buildOptions);
}
