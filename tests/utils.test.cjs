const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('module');
const ts = require('typescript');

const loadUtils = (mocks = {}) => {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (mocks[request]) return mocks[request];
    return originalLoad.apply(this, [request, parent, isMain]);
  };

  try {
    const filePath = path.resolve(__dirname, '../src/utils.ts');
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
    return compiledModule.exports;
  } finally {
    Module._load = originalLoad;
  }
};

test('accountSeedFromStr handles missing seeds gracefully', () => {
  const { accountSeedFromStr } = loadUtils();
  const result = accountSeedFromStr();
  assert.strictEqual(result, undefined);
});

test('accountSeedFromStr pads shorter strings and truncates longer ones', () => {
  const { accountSeedFromStr } = loadUtils();

  const short = accountSeedFromStr('abc');
  assert.ok(short, 'short seed should return a buffer');
  assert.strictEqual(short.length, 32);
  assert.deepEqual([...short.slice(0, 3)], [97, 98, 99]);
  assert.strictEqual([...short.slice(3)].every((byte) => byte === 0), true);

  const longSeed = 'x'.repeat(40);
  const truncated = accountSeedFromStr(longSeed);
  assert.ok(truncated, 'long seed should return a buffer');
  assert.strictEqual(truncated.length, 32);
  assert.strictEqual(truncated.every((byte) => byte === 120), true);
});

test('fromHexSig prefixes auth scheme and pads trailing byte', () => {
  const { fromHexSig } = loadUtils();
  const sig = fromHexSig('deadbeef');
  assert.deepEqual(
    Array.from(sig),
    [1, 0xde, 0xad, 0xbe, 0xef, 0],
    'signature should be prefixed and suffixed as expected'
  );
});

test('fromHexSig throws on odd-length strings', () => {
  const { fromHexSig } = loadUtils();
  assert.throws(() => fromHexSig('abc'), /Invalid string len/);
});

test('hexToBytes converts hex strings to byte arrays', () => {
  const { hexToBytes } = loadUtils();
  const bytes = hexToBytes('0aff');
  assert.deepEqual(Array.from(bytes), [0x0a, 0xff]);
});

test('getUncompressedPublicKeyFromWallet returns inline publicKey when present', async () => {
  const mocks = {
    '@getpara/web-sdk': class ParaWebMock {},
  };
  const { getUncompressedPublicKeyFromWallet } = loadUtils(mocks);
  const key = await getUncompressedPublicKeyFromWallet(
    new mocks['@getpara/web-sdk'](),
    { id: '1', publicKey: '0xabc', type: 'EVM' }
  );
  assert.strictEqual(key, '0xabc');
});

test('getUncompressedPublicKeyFromWallet pulls key from Para JWT payload', async () => {
  const payload = {
    data: {
      connectedWallets: [{ id: 'w1', publicKey: '0xfromjwt' }],
    },
  };
  globalThis.window = {
    atob: (input) => Buffer.from(input, 'base64').toString('binary'),
  };

  const token = [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64'),
    Buffer.from(JSON.stringify(payload)).toString('base64'),
    '',
  ].join('.');

  class ParaWebMock {
    issueJwt() {
      return Promise.resolve({ token });
    }
  }

  const { getUncompressedPublicKeyFromWallet } = loadUtils({
    '@getpara/web-sdk': ParaWebMock,
  });
  const key = await getUncompressedPublicKeyFromWallet(
    new ParaWebMock(),
    { id: 'w1', type: 'EVM' }
  );
  assert.strictEqual(key, '0xfromjwt');
  delete globalThis.window;
});

test('getUncompressedPublicKeyFromWallet throws when wallet missing in JWT', async () => {
  const payload = { data: { connectedWallets: [] } };
  globalThis.window = {
    atob: (input) => Buffer.from(input, 'base64').toString('binary'),
  };
  const token = [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64'),
    Buffer.from(JSON.stringify(payload)).toString('base64'),
    '',
  ].join('.');

  class ParaWebMock {
    issueJwt() {
      return Promise.resolve({ token });
    }
  }

  const { getUncompressedPublicKeyFromWallet } = loadUtils({
    '@getpara/web-sdk': ParaWebMock,
  });

  await assert.rejects(
    () =>
      getUncompressedPublicKeyFromWallet(
        new ParaWebMock(),
        { id: 'missing', type: 'EVM' }
      ),
    /Wallet Not Found/
  );
  delete globalThis.window;
});

test('evmPkToCommitment hashes compressed bytes with even/odd tagging', async () => {
  let capturedFelts;
  const mockSdk = {
    Felt: class Felt {
      constructor(value) {
        this.value = value;
      }
    },
    FeltArray: class FeltArray {
      constructor(elements) {
        this.elements = elements;
      }
    },
    Rpo256: {
      hashElements(feltArray) {
        capturedFelts = feltArray.elements;
        return { mocked: true, felts: feltArray.elements };
      },
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@demox-labs/miden-sdk') return mockSdk;
    return originalLoad.apply(this, [request, parent, isMain]);
  };

  try {
    const { evmPkToCommitment } = loadUtils();

    // y-coordinate ends with an odd nibble (3) to trigger odd tag
    const uncompressed =
      '0x04' +
      '12'.repeat(32) + // x
      '34'.repeat(31) +
      '33'; // y (odd)

    const result = await evmPkToCommitment(uncompressed);
    assert.ok(result.mocked, 'should return mock hash result');
    assert.ok(Array.isArray(capturedFelts), 'felts captured');
    assert.strictEqual(capturedFelts.length, 9, 'should produce 9 felts');
  } finally {
    Module._load = originalLoad;
  }
});
