# create-miden-para-react

`npm create miden-para-react@latest my-app` scaffolds the latest Vite `react-ts` starter, overwrites it with this repo's `vite.config.ts`, and adds `vite-plugin-node-polyfills` so the config works out of the box.

## What it does
- Runs `npm create vite@latest <target> -- --template react-ts` so you always start from the upstream default.
- Replaces `vite.config.ts` with the Para + Miden-friendly config (dedupe/exclude and WASM asset handling).
- Adds `vite-plugin-node-polyfills` to `devDependencies`.
- Installs dependencies using your detected package manager (`pnpm`, `yarn`, `bun`, or falls back to `npm`).

## Usage
- Standard: `npm create miden-para-react@latest my-new-app`
- Skip install: add `--skip-install` if you want to install later.

Publish from this folder with `npm publish --access public` when you're ready. For local testing, run `node ./packages/create-miden-para-react/bin/create-miden-para-react.mjs my-app`.
