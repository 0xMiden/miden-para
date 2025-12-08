## Mission

- Showcase how Para-connected wallets can drive Miden WebClient flows inside a Vite + React app.
- Keep this example runnable and copy-pastable for downstream apps using `miden-para` and `miden-para-react`.

## Project Surface

- **`src/components/ConsumeAllNotes.tsx`** — wraps `ParaProvider`, calls `useParaMiden(testnetRpc)`, and exposes a “consume all notes” demo using `@demox-labs/miden-sdk`.
- **`src/polyfills.ts`** — installs `Buffer`/`process` on `globalThis` for browser compatibility; imported first in `src/main.tsx`.
- **`vite.config.ts`** — keeps Miden SDK unbundled, dedupes Para packages, and includes node polyfills + WASM asset handling.
- **`scripts/clean-ts-artifacts.mjs`** — removes stray `.js`/`.js.map` files that have matching TS sources.
- **`README.md`** — setup instructions (env var `VITE_PARA_API_KEY`, dev/build/lint commands).

## Build, Run, Lint

- Install: `yarn install` (matches root pin) or `npm install`.
- Dev: `yarn dev` (runs `clean:ts` beforehand).
- Build: `yarn build` (`tsc -b` then `vite build`), Preview: `yarn preview`.
- Lint: `yarn lint`. Clean generated JS: `yarn clean:ts`.

## Key Flows

1. **Wallet connect + Para state** — `ParaProvider` uses `import.meta.env.VITE_PARA_API_KEY`; `useModal` drives “Connect Wallet”, `useAccount`/`useWallet` gate UI.
2. **Miden bootstrap** — `useParaMiden('https://rpc.testnet.miden.io')` returns `{ client, para, accountId, evmWallets }`; wait for all before actions.
3. **Consume notes** — dynamically import `@demox-labs/miden-sdk`, call `client.syncState()`, fetch consumable notes for `AccountId.fromHex(accountId)`, submit `newConsumeTransactionRequest`.
4. **Browser safety** — polyfills ensure Node globals, Vite config keeps WASM paths intact; avoid bundling the Miden SDK.

## Agent Playbooks

- **Add new demos**: create components under `src/components/`, reuse `ParaProvider`/`useParaMiden`; document steps in `README.md`.
- **UI tweaks**: adjust `App.tsx`, component markup, or CSS; keep imports minimal and avoid removing required polyfills.
- **SDK alignment**: respect `package.json` resolutions for Para SDKs; keep `miden-para`/`miden-para-react` versions in sync with the root package.
- **Env handling**: don’t hardcode API keys; rely on Vite env files (`.env.local`). Guard network calls behind readiness checks (`para`, `client`, `evmWallets`).

## External Contracts

- Para SDKs: `@getpara/react-sdk` (+ bundled styles), Para modal/state hooks.
- Miden: `miden-para`, `miden-para-react`, and runtime import of `@demox-labs/miden-sdk` (WASM-aware).
- Node shims: `vite-plugin-node-polyfills`, `buffer`, `process`.
