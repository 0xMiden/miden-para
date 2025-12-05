#!/usr/bin/env node
import { readdir, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const tsExtensions = ['.ts', '.tsx', '.cts', '.mts'];
const removedFiles = [];

function getBasePath(filePath) {
  if (filePath.endsWith('.js.map')) {
    return filePath.slice(0, -7); // remove .js.map
  }
  if (filePath.endsWith('.js')) {
    return filePath.slice(0, -3);
  }
  return null;
}

async function hasTypeScriptSource(basePath) {
  for (const ext of tsExtensions) {
    try {
      await access(`${basePath}${ext}`);
      return true;
    } catch (err) {
      // continue searching other extensions
    }
  }
  return false;
}

async function maybeRemove(filePath) {
  const basePath = getBasePath(filePath);
  if (!basePath) return;
  const matchesTsSource = await hasTypeScriptSource(basePath);
  if (!matchesTsSource) return;
  await unlink(filePath);
  removedFiles.push(path.relative(projectRoot, filePath));
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath);
    } else {
      await maybeRemove(entryPath);
    }
  }
}

async function main() {
  try {
    await walk(srcDir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('No src directory found.');
      process.exit(1);
    }
    throw err;
  }

  if (removedFiles.length === 0) {
    console.log('No generated JavaScript artifacts to clean.');
  } else {
    console.log(`Removed ${removedFiles.length} generated JavaScript artifact(s):`);
    for (const file of removedFiles) {
      console.log(`  - ${file}`);
    }
  }
}

main().catch((err) => {
  console.error('Failed to clean TypeScript artifacts:', err);
  process.exit(1);
});
