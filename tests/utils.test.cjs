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
    Poseidon2: {
      hashElements(feltArray) {
        capturedFelts = feltArray.elements;
        return { mocked: true, felts: feltArray.elements };
      },
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@miden-sdk/miden-sdk') return mockSdk;
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


// ---------------------------------------------------------------------------
// ECDSA public-key commitment — golden vectors.
//
// Generated from @miden-sdk/miden-sdk@0.15.9. For every vector,
//   AuthSecretKey.ecdsaWithRNG(seed).publicKey().toCommitment()
//     === Poseidon2.hashElements(felts)
// where `felts` is the preimage this module builds. Both halves are pinned so
// a drift in either is caught:
//
//   * `felts`      — the preimage. 0.16 replaces this 9-felt packing of the
//                    compressed SEC1 key with 16 felts of qx||qy, so these
//                    vectors must be regenerated when the SDK moves.
//   * hash family  — the protocol commits with Poseidon2. Committing with
//                    Rpo256 yields a valid-looking Word that is simply wrong
//                    and only surfaces as an auth rejection at transaction
//                    time. That was the bug these vectors exist to prevent.
//
// Vectors pin the public key rather than the RNG seed: seed -> key derivation
// is version-dependent, key -> commitment is the thing under test.
// ---------------------------------------------------------------------------

const COMMITMENT_VECTORS = [
  {
    // y-parity tag 0x03
    uncompressed: '0x04985ff69b8df24415caad235e80f919a010d6a52b5d86651bba4f460fcba4b3447d348e92a17ee5c42ebc213d1ed4b403f73a0726c0ac806cb8e4d25ccf50e839',
    felts: [4133459971, 1156746651, 598592021, 435781726, 2782269600, 1703304491, 1179630107, 3013921551, 68],
    commitment: '0xc063b413e4013c64374ddd78133bfb033996b968543f0ed58ac2c77c4da33c90',
  },
  {
    // y-parity tag 0x03
    uncompressed: '0x041669edc8c22bde908c19adb63ec95d0e7a9db0219634c0d52b50325d62abeb9ff1d66f40c8c80bde08adbb02d50b1d61a31273c224d295367e97f29012a1a0ed',
    felts: [3983087107, 3727409864, 2904132752, 1573469878, 2963110414, 3224671777, 844114901, 3953877597, 159],
    commitment: '0x2ef46fd60857c0eb63d067d8b6d33856b8ee9fd388879af5b9bb03e48fd6f191',
  },
  {
    // y-parity tag 0x02
    uncompressed: '0x04720e6952c52213f93130865938f38e6e0f9497d7ce653eee7b32883e0cf5f8e5c6d2bf8b04a2847788bacd2071f775b390c0efd3d25d8e51c54ee4fff35a852a',
    felts: [1762554370, 321045842, 2251305465, 2398304345, 2543062894, 1046859479, 2285009902, 4176809022, 229],
    commitment: '0x2074ddd9877ab64a5f15efc7161c86acccc762955d2fc7f846ac1e634fbd42e9',
  },
  {
    // y-parity tag 0x02
    uncompressed: '0x04f63531e49db17b4d19d6e2cdf4ec386f1a3533aa4a8e48dd406e3f047dd40160f126566cc57b3b94883221f54f4427dae98d8c6f9e1f878d5087ba6d6bba8f32',
    felts: [825619970, 2075237860, 3805681997, 955053261, 859118191, 1217284778, 1064190173, 30702852, 96],
    commitment: '0x8e4275e41ca20c833a89d1edf8ab12bb54b783ae63e3a557b594f753b6801d01',
  },
];

/** Minimal stand-in for the SDK's hashing surface that records what was called. */
const makeSdkSpy = () => {
  const calls = { poseidon2: [], rpo256: [] };
  const record = (bucket) => (feltArray) => {
    calls[bucket].push(feltArray.values.map((felt) => Number(felt.value)));
    return { toHex: () => `0x${bucket}` };
  };
  return {
    calls,
    sdk: {
      Felt: class Felt {
        constructor(value) {
          this.value = value;
        }
      },
      FeltArray: class FeltArray {
        constructor(values) {
          this.values = values;
        }
      },
      Poseidon2: { hashElements: record('poseidon2') },
      Rpo256: { hashElements: record('rpo256') },
    },
  };
};

// `evmPkToCommitment` reaches the SDK through `await import(...)`, which
// TypeScript lowers to `Promise.resolve().then(() => require(...))`. That
// require therefore runs AFTER loadUtils has restored Module._load, so the
// mock has to stay installed across the await rather than only across the
// module compile.
const withMockedSdk = async (sdk, run) => {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request.startsWith('@miden-sdk/miden-sdk')) return sdk;
    return originalLoad.apply(this, [request, parent, isMain]);
  };
  try {
    return await run();
  } finally {
    Module._load = originalLoad;
  }
};

test('evmPkToCommitment builds the pinned Poseidon2 preimage', async () => {
  for (const vector of COMMITMENT_VECTORS) {
    const { sdk, calls } = makeSdkSpy();
    const { evmPkToCommitment } = loadUtils({ '@miden-sdk/miden-sdk': sdk });

    await withMockedSdk(sdk, () => evmPkToCommitment(vector.uncompressed));

    assert.deepEqual(
      calls.poseidon2[0],
      vector.felts,
      `preimage drifted for ${vector.uncompressed}`
    );
  }
});

test('evmPkToCommitment hashes with Poseidon2 and never Rpo256', async () => {
  for (const vector of COMMITMENT_VECTORS) {
    const { sdk, calls } = makeSdkSpy();
    const { evmPkToCommitment } = loadUtils({ '@miden-sdk/miden-sdk': sdk });

    await withMockedSdk(sdk, () => evmPkToCommitment(vector.uncompressed));

    assert.strictEqual(calls.poseidon2.length, 1, 'expected exactly one Poseidon2 hash');
    assert.strictEqual(
      calls.rpo256.length,
      0,
      'commitments must not be hashed with Rpo256 — the protocol commits with Poseidon2'
    );
  }
});
