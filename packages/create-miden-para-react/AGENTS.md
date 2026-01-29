## Mission
- Ship a `npm create @miden-sdk/miden-para-react` helper that bootstraps the stock Vite `react-ts` template and applies Para + Miden defaults (config + starter UI) so developers get a working dev server without manual setup.
- Keep the CLI minimal (no custom prompts), ESM-only, and compatible with Node 18+.

## Package Layout
- `bin/create-miden-para-react.mjs` — CLI entry. Invokes `npm create vite@latest`, overwrites `vite.config.ts`, replaces `src/App.tsx` with a Para + Miden starter, adds deps, and installs via the detected package manager (unless skipped).
- `template/vite.config.ts` — opinionated Vite config: React plugin, `vite-plugin-node-polyfills`, excludes/dedupes Para/Miden bundles, and treats `.wasm` as assets.
- `template/src/App.tsx` — minimal ParaProvider + `useParaMiden` example wired with TanStack Query and a node URL placeholder.
- `README.md` — user-facing usage notes and publish command.

## Flow (bin/create-miden-para-react.mjs)
1. Parse args: first non-flag is the target dir (default `miden-para-react-app`); `--skip-install`/`--no-install` suppress dependency install.
2. Resolve `targetDir` and run `npm create vite@latest <basename> --yes --no-install` from `dirname(targetDir)`, piping “n” to install prompts so the scaffold returns control before we patch files.
3. Copy `template/vite.config.ts` into the new project root.
4. Replace `src/App.tsx` with the starter from `template/src/App.tsx`.
5. Patch `package.json` to ensure `devDependencies.vite-plugin-node-polyfills = ^0.24.0` and add Para/Miden + connector deps (mirror `examples/react`: @miden-sdk/miden-para, @miden-sdk/use-miden-para-react, @getpara/react-sdk, @demox-labs/miden-sdk, tanstack query, wagmi stack, graz, CosmJS, Solana adapters, etc.).
6. Write `.npmrc` with `legacy-peer-deps=true` so `npm install` succeeds despite the @miden-sdk/use-miden-para-react/@miden-sdk/miden-para peer mismatch.
7. Copy `template/src/polyfills.ts` and inject `import "./polyfills";` into `src/main.tsx` if missing.
8. Detect package manager from `npm_config_user_agent` (`pnpm`, `yarn`, `bun`, fallback `npm`) and install deps unless skipped.

## Build & Publish
- No build step needed; published assets are the CLI, template config, and docs listed in `files`.
- Publish from this folder: `npm publish --access public`. Local dry-run: `node ./packages/create-miden-para-react/bin/create-miden-para-react.mjs <dir>`.

## Agent Playbooks
- **Config updates**: edit `template/vite.config.ts` to track Para/Miden bundling rules or polyfill needs; keep it minimal and framework-agnostic.
- **Starter UI tweaks**: update `template/src/App.tsx` to showcase new flows; mirror deps in the `ensureMidenParaDependencies` patcher.
- **New flags**: add parsing to the CLI but preserve current defaults and backward compatibility; log steps clearly.
- **Dependency pins**: bump `vite-plugin-node-polyfills` version in both the patch logic and template if upstream requires.
- **E2E checks**: when changing flow, run the CLI against a temp dir and confirm `npm run dev` works with Para/Miden packages.

## External Contracts
- `npm create vite@latest` — upstream scaffolder; relies on network access when the CLI runs.
- `vite-plugin-node-polyfills@^0.24.0` — ensures Node globals are available for Miden SDK in Vite.
- Para/Miden packages (`@getpara/*`, `@demox-labs/miden-sdk`) — stay excluded/deduped in `vite.config.ts` so WASM and component runtimes behave in dev.
