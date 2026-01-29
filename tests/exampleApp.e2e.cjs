const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const puppeteer = require('puppeteer');

const exampleRoot = path.resolve(__dirname, '../examples/react');
const runExample = process.env.RUN_EXAMPLE_E2E === '1';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const packPackage = (cwd) => {
  const destDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'miden-para-pack-')
  );
  const result = spawnSync('npm', ['pack', '--silent', '--pack-destination', destDir], {
    cwd,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      `npm pack failed in ${cwd}:\n${result.stderr || result.stdout}`
    );
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const matches = output.match(/[^\s]+\.tgz/g);
  if (!matches || matches.length === 0) {
    throw new Error(`npm pack did not output a tarball name:\n${output}`);
  }

  const tarballName = matches[matches.length - 1];
  const tarballPath = path.join(destDir, tarballName);
  if (fs.existsSync(tarballPath)) return tarballPath;

  throw new Error(`Tarball ${tarballName} not found in ${destDir}`);
};

const copyExample = (targetDir) => {
  fs.cpSync(exampleRoot, targetDir, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(exampleRoot, src);
      if (!rel) return true;
      if (rel.startsWith('node_modules')) return false;
      if (rel.startsWith('dist')) return false;
      if (rel.startsWith('.vite')) return false;
      return true;
    },
  });
};

const waitForServer = async (url, timeoutMs = 60000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return;
    } catch (error) {
      // ignore until timeout
    }
    await wait(500);
  }
  throw new Error(`Server not reachable at ${url} after ${timeoutMs}ms`);
};

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });

test(
  'example app renders Connect Wallet button',
  { skip: !runExample, timeout: 300000 },
  async (t) => {
    const tmpRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'miden-para-example-e2e-')
    );
    const tempExample = path.join(tmpRoot, 'app');
    console.log('Copying example app to temp dir');
    copyExample(tempExample);

    console.log('Packing local SDK tarballs');
    const rootTarball = packPackage(path.resolve(__dirname, '..'));
    const hookTarball = packPackage(
      path.resolve(__dirname, '../packages/use-miden-para-react')
    );

    const pkgPath = path.join(tempExample, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies ?? {};
    pkg.dependencies['@miden-sdk/miden-para'] = `file:${rootTarball}`;
    pkg.dependencies['@miden-sdk/use-miden-para-react'] = `file:${hookTarball}`;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

    console.log('Installing example dependencies');
    const install = spawnSync('yarn', ['install', '--ignore-scripts'], {
      cwd: tempExample,
      stdio: 'inherit',
      timeout: 180000,
    });
    if (install.error && install.error.code === 'ETIMEDOUT') {
      throw new Error('yarn install timed out after 180s');
    }
    assert.strictEqual(install.status, 0);

    const port = await getFreePort();
    const url = `http://127.0.0.1:${port}`;
    const env = {
      ...process.env,
      VITE_PARA_API_KEY: process.env.VITE_PARA_API_KEY || 'test-api-key',
      CI: '1',
      BROWSER: 'none',
    };

    console.log('Starting Vite dev server');
    const child = spawn(
      'yarn',
      ['dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: tempExample,
        env,
        stdio: 'pipe',
      }
    );

    let output = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    const shutdown = async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
        await wait(500);
      }
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    };

    t.after(async () => {
      await shutdown();
    });

    console.log('Waiting for dev server to respond');
    const serverReady = waitForServer(url, 90000);
    const serverExited = new Promise((_, reject) => {
      child.once('exit', (code, signal) => {
        reject(
          new Error(
            `Vite dev server exited early (code ${code ?? 'null'}, signal ${
              signal ?? 'null'
            }).\n${output}`
          )
        );
      });
    });
    await Promise.race([serverReady, serverExited]);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await wait(500);
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll('button')).some((button) =>
            (button.textContent || '').includes('Connect Wallet')
          ),
        { timeout: 60000 }
      );
    } catch (error) {
      throw new Error(
        `Example app did not render expected Connect Wallet button.\n${output}\n${error}`
      );
    } finally {
      await browser.close();
      await shutdown();
    }
  }
);
