# Miden + Para React Example

Minimal Vite + React app that wires Para’s React SDK to the `miden-para` packages so you can connect a wallet, spin up a Para-backed Miden client, and consume notes on testnet.

## Quickstart
- Install deps: `yarn install` (or `npm install`)
- Add env: create `.env.local` with `VITE_PARA_API_KEY=<your_para_api_key>`
- Dev server: `yarn dev` (runs `clean:ts` before Vite)
- Build: `yarn build` (`tsc -b` then `vite build`), Preview: `yarn preview`
- Lint: `yarn lint`

## How it works
- `ParaProvider` wraps the app with your API key and app name.
- `useParaMiden('https://rpc.testnet.miden.io')` builds a Miden WebClient that delegates signing to Para’s modal flow.
- `ConsumeAllNotes` shows wallet connection state, syncs the client, fetches consumable notes for the connected account, and submits a consume transaction.
- `polyfills.ts` installs `Buffer` and `process` on `globalThis` so browser builds satisfy Node expectations.
- `vite.config.ts` keeps the Miden SDK unbundled, dedupes Para packages, and enables node polyfills + WASM assets.

## Files to know
- `src/components/ConsumeAllNotes.tsx` — Para provider + demo action
- `src/polyfills.ts` — Node globals for the browser
- `src/main.tsx` — imports polyfills first, renders `App`
- `vite.config.ts` — bundling guards for Para/Miden SDKs
- `scripts/clean-ts-artifacts.mjs` — removes generated JS alongside TS sources

## Running the flow
1) Start dev server (`yarn dev`) and open the app.
2) Click **Connect Wallet** to launch Para’s modal; pick an EVM wallet.
3) After connection, click **ConsumeNotes** to:
   - sync client state
   - fetch consumable notes for the connected account
   - submit a consume transaction (logs tx id to console)

## Troubleshooting
- Missing API key: set `VITE_PARA_API_KEY` in an env file Vite can read.
- No consumable notes: the demo logs “No notes to consume.”; mint or fund the account first.
- WASM/SDK bundling errors: ensure you kept `@demox-labs/miden-sdk` excluded and Para packages deduped per `vite.config.ts`.
