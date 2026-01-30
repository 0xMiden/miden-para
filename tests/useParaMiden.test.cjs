const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('module');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');

const { act } = renderer;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const loadUseParaMiden = (mocks = {}) => {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (mocks[request]) return mocks[request];
    if (request.startsWith('@demox-labs/miden-sdk')) {
      return mocks['@demox-labs/miden-sdk'];
    }
    if (request.startsWith('@miden-sdk/miden-para')) {
      return mocks['@miden-sdk/miden-para'];
    }
    if (request.startsWith('@getpara/react-sdk-lite')) {
      return mocks['@getpara/react-sdk-lite'];
    }
    return originalLoad.apply(this, [request, parent, isMain]);
  };

  try {
    const filePath = path.resolve(
      __dirname,
      '../packages/use-miden-para-react/src/useParaMiden.ts'
    );
    const source = fs.readFileSync(filePath, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filePath,
    });

    const compiledModule = new Module(filePath, module);
    compiledModule.filename = filePath;
    compiledModule.paths = Module._nodeModulePaths(path.dirname(filePath));
    compiledModule._compile(outputText, filePath);
    return {
      useParaMiden: compiledModule.exports.useParaMiden,
      restore: () => {
        Module._load = originalLoad;
      },
    };
  } catch (error) {
    Module._load = originalLoad;
    throw error;
  }
};

const renderHook = async (useParaMiden, args) => {
  let latest;
  const Harness = ({ hookArgs }) => {
    latest = useParaMiden(...hookArgs);
    return null;
  };

  let testRenderer;
  await act(async () => {
    testRenderer = renderer.create(
      React.createElement(Harness, { hookArgs: args })
    );
    await flushPromises();
    await flushPromises();
  });

  const rerender = async (nextArgs) => {
    await act(async () => {
      testRenderer.update(
        React.createElement(Harness, { hookArgs: nextArgs })
      );
      await flushPromises();
      await flushPromises();
    });
  };

  return { getLatest: () => latest, rerender };
};

const buildMocks = (state, calls, client) => ({
  '@getpara/react-sdk-lite': {
    useClient: () => state.para,
    useAccount: () => ({
      isConnected: state.isConnected,
      embedded: { wallets: state.wallets },
    }),
  },
  '@miden-sdk/miden-para': {
    createParaMidenClient: async (...args) => {
      calls.push(args);
      return { client, accountId: 'acc-123' };
    },
  },
  '@demox-labs/miden-sdk': {
    AccountType: { RegularAccountImmutableCode: 'RegularAccountImmutableCode' },
  },
});

test('useParaMiden returns defaults when disconnected', async () => {
  const state = {
    para: null,
    isConnected: false,
    wallets: [],
  };
  const calls = [];
  const client = { id: 'client' };
  const { useParaMiden, restore } = loadUseParaMiden(
    buildMocks(state, calls, client)
  );

  try {
    const { getLatest } = await renderHook(useParaMiden, [
      'https://rpc.testnet.miden.io',
      'public',
    ]);

    assert.strictEqual(calls.length, 0);
    const latest = getLatest();
    assert.strictEqual(latest.client, null);
    assert.strictEqual(latest.accountId, '');
    assert.deepEqual(latest.evmWallets, []);
  } finally {
    restore();
  }
});

test('useParaMiden filters EVM wallets and forwards options', async () => {
  const state = {
    para: { id: 'para' },
    isConnected: true,
    wallets: [
      { id: 'evm-1', type: 'EVM' },
      { id: 'sol-1', type: 'SOLANA' },
    ],
  };
  const calls = [];
  const client = { id: 'client' };
  const { useParaMiden, restore } = loadUseParaMiden(
    buildMocks(state, calls, client)
  );
  const opts = {
    accountSeed: 'seed',
    noteTransportUrl: 'https://transport.miden.io',
  };
  const confirmStep = () => {};

  try {
    const { getLatest } = await renderHook(useParaMiden, [
      'https://rpc.testnet.miden.io',
      'private',
      opts,
      false,
      confirmStep,
    ]);

    assert.strictEqual(calls.length, 1);
    const [paraArg, walletsArg, optsArg, showSigningModalArg, confirmArg] =
      calls[0];
    assert.strictEqual(paraArg, state.para);
    assert.strictEqual(walletsArg.length, 1);
    assert.strictEqual(walletsArg[0].id, 'evm-1');
    assert.strictEqual(optsArg.endpoint, 'https://rpc.testnet.miden.io');
    assert.strictEqual(optsArg.storageMode, 'private');
    assert.strictEqual(optsArg.accountSeed, 'seed');
    assert.strictEqual(
      optsArg.noteTransportUrl,
      'https://transport.miden.io'
    );
    assert.strictEqual(optsArg.type, 'RegularAccountImmutableCode');
    assert.strictEqual(showSigningModalArg, false);
    assert.strictEqual(confirmArg, confirmStep);

    const latest = getLatest();
    assert.strictEqual(latest.client, client);
    assert.strictEqual(latest.accountId, 'acc-123');
  } finally {
    restore();
  }
});

test('useParaMiden does not recreate client once initialized', async () => {
  const state = {
    para: { id: 'para' },
    isConnected: true,
    wallets: [{ id: 'evm-1', type: 'EVM' }],
  };
  const calls = [];
  const client = { id: 'client' };
  const { useParaMiden, restore } = loadUseParaMiden(
    buildMocks(state, calls, client)
  );

  try {
    const { rerender } = await renderHook(useParaMiden, [
      'https://rpc.testnet.miden.io',
      'public',
    ]);

    assert.strictEqual(calls.length, 1);
    await rerender(['https://rpc.testnet.miden.io', 'public']);
    assert.strictEqual(calls.length, 1);
  } finally {
    restore();
  }
});
