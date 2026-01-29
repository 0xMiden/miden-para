# @miden-sdk/create-miden-para-react

`npm create @miden-sdk/miden-para-react@latest my-app` scaffolds the latest Vite `react-ts` starter, overwrites it with this repo's `vite.config.ts`, swaps in a Para + Miden-ready `App.tsx`, and adds the deps needed to run it out of the box. The scaffold always runs `create-vite` with `--yes --no-install` and pipes “no” to the install prompt to prevent upstream installs from overwriting the template before we patch it.

## What it does
- Runs `npm create vite@latest <target> -- --template react-ts` so you always start from the upstream default.
- Replaces `vite.config.ts` with the Para + Miden-friendly config (dedupe/exclude and WASM asset handling).
- Replaces `src/App.tsx` with a ParaProvider + `useParaMiden` starter that reports the account ID and client readiness.
- Adds Para/Miden + connector deps (matching `examples/react`) so Para SDK peers resolve: `@miden-sdk/miden-para`, `@miden-sdk/use-miden-para-react`, `@getpara/react-sdk-lite`, `@getpara/evm-wallet-connectors`, `@demox-labs/miden-sdk`, `@tanstack/react-query`, `@wagmi/core`, `viem`, `wagmi`, and `vite-plugin-node-polyfills`.
- Installs dependencies using your detected package manager (`pnpm`, `yarn`, `bun`, or falls back to `npm`); `create-vite` is invoked with `--yes --no-install` and auto-answers “no” to install prompts to avoid reverting the patched files.
- Writes `.npmrc` with `legacy-peer-deps=true` so `npm install` works despite a known peer mismatch between `@miden-sdk/use-miden-para-react` and `@miden-sdk/miden-para`.
- Adds `src/polyfills.ts` and injects it into `src/main.tsx` to provide `Buffer`/`process` in the browser.

## Usage
- Standard: `npm create @miden-sdk/miden-para-react@latest my-new-app`
- Skip install: add `--skip-install` if you want to install later.
- Set `VITE_PARA_API_KEY` in a `.env.local` (or similar) file so the generated `App.tsx` can initialize Para. **Production deployments require a Para production API key.**
- Recommended next steps: `cd my-new-app && npm install && npm run dev` (`.npmrc` opts into legacy peer deps so npm works).

Publish from this folder with `npm publish --access public` when you're ready. For local testing, run `node ./packages/create-miden-para-react/bin/create-miden-para-react.mjs my-app`.
