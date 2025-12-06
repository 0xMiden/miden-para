## Mission
- Ship a `npm create miden-para-react` helper that bootstraps the stock Vite `react-ts` template and applies Para + Miden defaults so developers get a working dev server without manual config.
- Keep the CLI minimal (no custom prompts), ESM-only, and compatible with Node 18+.

## Package Layout
- `bin/create-miden-para-react.mjs` — CLI entry. Invokes `npm create vite@latest`, overwrites `vite.config.ts`, adds the node polyfill plugin, and installs deps via the detected package manager (unless skipped).
- `template/vite.config.ts` — opinionated Vite config: React plugin, `vite-plugin-node-polyfills`, excludes/dedupes Para/Miden bundles, and treats `.wasm` as assets.
- `README.md` — user-facing usage notes and publish command.

## Flow (bin/create-miden-para-react.mjs)
1. Parse args: first non-flag is the target dir (default `miden-para-react-app`); `--skip-install`/`--no-install` suppress dependency install.
2. Run `npm create vite@latest <target> -- --template react-ts`.
3. Copy `template/vite.config.ts` into the new project root.
4. Patch `package.json` to ensure `devDependencies.vite-plugin-node-polyfills = ^0.24.0`.
5. Detect package manager from `npm_config_user_agent` (`pnpm`, `yarn`, `bun`, fallback `npm`) and install deps unless skipped.

## Build & Publish
- No build step needed; published assets are the CLI, template config, and docs listed in `files`.
- Publish from this folder: `npm publish --access public`. Local dry-run: `node ./packages/create-miden-para-react/bin/create-miden-para-react.mjs <dir>`.

## Agent Playbooks
- **Config updates**: edit `template/vite.config.ts` to track Para/Miden bundling rules or polyfill needs; keep it minimal and framework-agnostic.
- **New flags**: add parsing to the CLI but preserve current defaults and backward compatibility; log steps clearly.
- **Dependency pins**: bump `vite-plugin-node-polyfills` version in both the patch logic and template if upstream requires.
- **E2E checks**: when changing flow, run the CLI against a temp dir and confirm `npm run dev` works with Para/Miden packages.

## External Contracts
- `npm create vite@latest` — upstream scaffolder; relies on network access when the CLI runs.
- `vite-plugin-node-polyfills@^0.24.0` — ensures Node globals are available for Miden SDK in Vite.
- Para/Miden packages (`@getpara/*`, `@demox-labs/miden-sdk`) — stay excluded/deduped in `vite.config.ts` so WASM and component runtimes behave in dev.
