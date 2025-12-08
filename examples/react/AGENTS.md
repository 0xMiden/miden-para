## Mission

- Provide a runnable Vite + React example that connects Para wallets, boots a Miden client via `useParaMiden`, and demonstrates mint/consume, balance lookups, and sending assets.

## Project Surface

- **`src/App.tsx`** — main UI wiring Para connection to mint/consume, balance, and send actions.
- **`src/components/MintConsumeDialog.tsx`** — progress/error dialog for faucet mint + consume.
- **`src/components/SendDialog.tsx`** — form to send assets to a Bech32 address.
- **`src/components/BalanceDialog.tsx`** — renders balances inside `App`.
- **`src/lib/`** — helpers for minting, sending, and balance queries.
- **`vite.config.ts`** — keeps Miden SDK unbundled, dedupes Para packages, and enables WASM/node polyfills.
- **`README.md`** — setup instructions (env var `VITE_PARA_API_KEY`, dev/build/lint commands).

## Build, Run, Lint

- Install: `yarn install` (root uses Yarn 1.22.22).
- Dev: `yarn dev`.
- Build: `yarn build`, Preview: `yarn preview`.
- Lint: `yarn lint`.

## Key Flows

1. **Wallet connect + Para state** — `ParaProvider` in `src/main.tsx` reads `VITE_PARA_API_KEY`; `useModal` drives connect/disconnect, `useAccount` gates UI.
2. **Miden bootstrap** — `useParaMiden('https://rpc.testnet.miden.io', 'public', { accountSeed: 'hello world', noteTransportUrl: 'https://transport.miden.io' })` returns `{ client, para, accountId }` for the UI.
3. **Actions** — faucet mint + consume (`createFaucetMintAndConsume`), balances (`getBalance`), and sending (`send`) live in `src/lib/` and are driven by dialogs.

## External Contracts

- Para: `@getpara/react-sdk` (modal/state hooks).
- Miden: `miden-para-react`, `@demox-labs/miden-sdk`.
- Vite plugins: `vite-plugin-node-polyfills`, `vite-plugin-wasm`, top-level-await for WASM.
