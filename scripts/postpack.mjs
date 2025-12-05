import { mkdirSync, renameSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const pkgRaw = await readFile(path.join(repoRoot, 'package.json'), 'utf8');
const pkg = JSON.parse(pkgRaw);
const tarballBase = pkg.name.replace(/^@/, '').replace(/\//g, '-');
const tarballName = `${tarballBase}-${pkg.version}.tgz`;

const sourcePath = path.join(repoRoot, tarballName);
const destDir = path.join(repoRoot, 'build');
const destPath = path.join(destDir, tarballName);

mkdirSync(destDir, { recursive: true });

if (existsSync(sourcePath)) {
  renameSync(sourcePath, destPath);
  console.log(`Moved ${tarballName} to ${path.relative(repoRoot, destDir)}/`);
  process.exit(0);
}

if (existsSync(destPath)) {
  console.log(`${tarballName} already located in ${path.relative(repoRoot, destDir)}/`);
  process.exit(0);
}

console.warn(
  `Expected tarball ${tarballName} not found in project root or ${path.relative(repoRoot, destDir)}/; nothing to move.`,
);
