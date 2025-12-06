## Mission
- Showcase how `miden-para` + `miden-para-react` feel inside a modern React stack, using Para’s modal to connect a wallet and driving a simple Miden flow (`consumeAllNotes`).
- Serve as a runnable playground for debugging hook changes and documenting integration quirks (polyfills, Vite config, env vars).

## Layout
- `src/` — Vite app with:
  - `components/ConsumeAllNotes.tsx` housing the Para provider, hook usage, and the sample transaction action.
  - `App.tsx`, `main.tsx`, `App.css`, `polyfills.ts` for wiring and styling.
- `scripts/clean-ts-artifacts.mjs` — removes stray JS output before builds (`npm run clean:ts`).
- `vite.config.ts` — React plugin + `vite-plugin-node-polyfills`, excludes `@demox-labs/miden-sdk` from pre-bundling, ensures WASM assets load.
- `README.md` — setup instructions, flow explanation, and tips for extending the example.

## Runbook
- Install deps: `cd examples/react && yarn install` (or npm).
- Local env: provide `VITE_PARA_API_KEY` (e.g., `.env.local`).
- Dev server: `yarn dev` → launches Vite with Para modal ready.
- Build: `yarn build` (runs `tsc -b` then `vite build` after cleaning TS artifacts).
- Preview: `yarn preview`; Lint: `yarn lint`.

## Flow (src/components/ConsumeAllNotes.tsx)
1. Wrap app with `ParaProvider` (API key + friendly `config.appName`) and TanStack Query provider.
2. `useParaMiden('https://rpc.testnet.miden.io')` spins up the Para-backed `WebClient`, returning `{ client, accountId, para, evmWallets }`.
3. Wallet connect button calls `useModal().openModal`; when connected, the UI shows the Para wallet address.
4. `consumeAllNotes` lazily imports the Miden SDK, syncs state, fetches consumable notes for `accountId`, and submits a consume transaction.
5. Browser polyfills in `src/polyfills.ts` provide `Buffer` and `process` expected by upstream SDKs.

## Agent Playbooks
- **Adjusting the demo flow**: edit `ConsumeAllNotes.tsx`; add new buttons/actions but keep the Para provider + hook wiring intact.
- **Changing RPC or storage mode**: update the `useParaMiden` call or pass extra options once the hook supports them.
- **Troubleshooting WASM**: ensure `vite.config.ts` keeps `@demox-labs/miden-sdk` excluded and `assetsInclude` contains `*.wasm`; keep `polyfills.ts` imported in `main.tsx`.
- **Cleaning builds**: run `npm run clean:ts` if stale `.js/.js.map` files appear under `src/`.

## External Contracts
- Para dashboard & React SDK (`@getpara/react-sdk`) — needs a valid API key and controls wallet connection modal.
- `miden-para-react` + `miden-para` — the hook and SDK under test; keep versions in `package.json` aligned with workspace releases.
- `@demox-labs/miden-sdk` — dynamically imported in-browser; requires WASM asset loading (handled by Vite config).
