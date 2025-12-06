# create-miden-para-react

`npm create miden-para-react@latest my-app` scaffolds the latest Vite `react-ts` starter, overwrites it with this repo's `vite.config.ts`, swaps in a Para + Miden-ready `App.tsx`, and adds the deps needed to run it out of the box. The scaffold always runs `create-vite` with `--no-install` so dependencies are added after we patch the template.

## What it does
- Runs `npm create vite@latest <target> -- --template react-ts` so you always start from the upstream default.
- Replaces `vite.config.ts` with the Para + Miden-friendly config (dedupe/exclude and WASM asset handling).
- Replaces `src/App.tsx` with a ParaProvider + `useParaMiden` starter that reports the account ID and client readiness.
- Adds `miden-para-react`, `miden-para`, `@getpara/react-sdk`, `@tanstack/react-query`, and `vite-plugin-node-polyfills` to `package.json`.
- Installs dependencies using your detected package manager (`pnpm`, `yarn`, `bun`, or falls back to `npm`); `create-vite` is invoked with `--no-install` to avoid reverting the patched files.

## Usage
- Standard: `npm create miden-para-react@latest my-new-app`
- Skip install: add `--skip-install` if you want to install later.
- Set `VITE_PARA_API_KEY` in a `.env.local` (or similar) file so the generated `App.tsx` can initialize Para.

Publish from this folder with `npm publish --access public` when you're ready. For local testing, run `node ./packages/create-miden-para-react/bin/create-miden-para-react.mjs my-app`.
