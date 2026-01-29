# Miden + Para React Example

Vite + React app that connects Para wallets, spins up a Para-backed Miden WebClient via `@miden-sdk/use-miden-para-react`, and lets you mint from a faucet, view balances, and send assets on testnet.

## Quickstart
- Install deps: `yarn install`
- Env: create `.env.local` with `VITE_PARA_API_KEY=<your_para_api_key>`. **Production deployments require a Para production API key.**
- Dev server: `yarn dev`
- Build: `yarn build`, Preview: `yarn preview`, Lint: `yarn lint`

## Flow
1) `ParaProvider` in `src/main.tsx` injects your API key and app name.
2) `useParaMiden('https://rpc.testnet.miden.io', 'public', { accountSeed: 'hello world', noteTransportUrl: 'https://transport.miden.io' })` boots the Miden client and account inside `src/App.tsx`.
3) UI actions in `App.tsx`:
   - **Connect Wallet** toggles Para modal (connects/disconnects).
   - **Mint & Consume** uses `createFaucetMintAndConsume` to mint from the faucet then consume.
   - **View Balances** reads balances via `getBalance` and shows them in a dialog.
   - **Send** opens `SendDialog` to transfer to a Bech32 address using `send`.

## Key files
- `src/App.tsx` — main UI wiring Para state to mint/consume/balance/send actions.
- `src/components/MintConsumeDialog.tsx` — progress + errors for faucet mint/consume.
- `src/components/SendDialog.tsx` — send form wired to the `send` helper.
- `src/components/BalanceDialog.tsx` — balance modal (rendered inline in App).
- `src/lib/` — `mint`, `send`, and `getBalance` helpers plus shared types/utils.
- `src/main.tsx` — mounts the app with `ParaProvider` and React Query.

## Notes
- Para environment is set to `Environment.BETA` in `main.tsx`; adjust if you need prod.
- The seed in `useParaMiden` is for demo purposes only; replace it for private mode or persistent accounts.
- If bundling complaints appear around WASM or node shims, ensure Vite plugins in `vite.config.ts` stay intact (`vite-plugin-node-polyfills`, top-level await, WASM).
