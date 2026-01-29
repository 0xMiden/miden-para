const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const cliPath = path.resolve(
  __dirname,
  '../packages/create-miden-para-react/bin/create-miden-para-react.mjs'
);

const runCli = (targetDir, args = [], env = {}) => {
  const result = spawnSync('node', [cliPath, targetDir, ...args], {
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : '';
    const stdout = result.stdout ? result.stdout.toString() : '';
    throw new Error(`CLI failed:\n${stderr}\n${stdout}`);
  }

  return result;
};

test('CLI scaffolds template and patches package.json in test mode', () => {
  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'miden-para-create-')
  );
  const targetDir = path.join(tmpRoot, 'app');

  runCli(targetDir, ['--skip-install'], { MIDEN_PARA_TEST_MODE: '1' });

  const pkgPath = path.join(targetDir, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json should be created');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(
    pkg.dependencies['@miden-sdk/miden-para'],
    'miden-para dependency should be injected'
  );
  assert.ok(
    pkg.dependencies['@miden-sdk/use-miden-para-react'],
    'use-miden-para-react dependency should be injected'
  );
  assert.ok(
    pkg.dependencies['@getpara/react-sdk-lite'],
    'Para React SDK lite should be injected'
  );
  assert.ok(
    pkg.dependencies['@getpara/evm-wallet-connectors'],
    'Para EVM connectors should be injected'
  );
  assert.ok(pkg.dependencies.wagmi, 'wagmi should be injected');
  assert.ok(pkg.dependencies.viem, 'viem should be injected');
  assert.ok(pkg.dependencies['@wagmi/core'], 'wagmi core should be injected');
  assert.ok(
    pkg.devDependencies['vite-plugin-node-polyfills'],
    'vite-plugin-node-polyfills should be injected'
  );
  assert.strictEqual(
    pkg.scripts.postinstall,
    'setup-para',
    'postinstall script should be set'
  );
  assert.strictEqual(pkg.peerDependencies, undefined);

  const appPath = path.join(targetDir, 'src', 'App.tsx');
  const appContents = fs.readFileSync(appPath, 'utf8');
  assert.match(appContents, /useParaMiden/);
  assert.match(appContents, /@miden-sdk\/use-miden-para-react/);

  const mainPath = path.join(targetDir, 'src', 'main.tsx');
  const mainContents = fs.readFileSync(mainPath, 'utf8');
  assert.ok(
    mainContents.startsWith('import "./polyfills";'),
    'polyfills import should be injected at top of main.tsx'
  );

  assert.ok(
    fs.existsSync(path.join(targetDir, 'src', 'polyfills.ts')),
    'polyfills.ts should be created'
  );
  assert.ok(
    fs.existsSync(path.join(targetDir, 'vite.config.ts')),
    'vite.config.ts should be written'
  );

  const npmrcPath = path.join(targetDir, '.npmrc');
  const npmrcContents = fs.readFileSync(npmrcPath, 'utf8');
  assert.match(npmrcContents, /legacy-peer-deps=true/);
});

const runE2E = process.env.RUN_CREATE_MIDEN_PARA_E2E === '1';

test(
  'CLI scaffold installs and builds (e2e)',
  { skip: !runE2E },
  () => {
    const tmpRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'miden-para-create-e2e-')
    );
    const targetDir = path.join(tmpRoot, 'app');

    runCli(targetDir, [], { npm_config_yes: 'true' });

    const build = spawnSync('npm', ['run', 'build'], {
      cwd: targetDir,
      stdio: 'inherit',
    });
    assert.strictEqual(build.status, 0);
  }
);
