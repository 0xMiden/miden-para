## Mission
- Provide a zero-config React hook (`useParaMiden`) that turns Para React SDK context into a ready-to-use Miden `WebClient` + `accountId`.
- Keep the hook thin, dependency-light, and browser-safe so it can drop into any React 18/19 app that already wraps with `ParaProvider`.

## Package Layout
- `src/useParaMiden.ts` — main hook. Watches Para connection state, filters EVM wallets, spins up `createParaMidenClient`, and exposes `{ client, accountId, para, evmWallets, nodeUrl }`.
- `src/index.ts` — re-exports the hook for consumers.
- `tsup.config.ts` — bundles ESM + CJS outputs with d.ts via tsup, marking Para/Miden/React as externals.
- `README.md` — installation, peer deps, sample usage.

## Build & Publish
- Install deps (`yarn install`) at repo root; this package relies on workspace tooling.
- Build artifacts: `cd packages/use-miden-para-react && yarn build` (runs tsup → `dist/index.{mjs,cjs,d.ts}`).
- Publishing: `npm run publish` from this folder builds then publishes `miden-para-react`.

## Hook Flow (src/useParaMiden.ts)
1. Read Para context via `useClient`, `useAccount`, `useWallet`.
2. Memoize `evmWallets` from the embedded wallet list.
3. `useEffect` guards against running before Para connects or when a client already exists.
4. Lazily import `@demox-labs/miden-sdk` for `AccountType` and call `createParaMidenClient` from the root package, passing node endpoint + storage mode.
5. Persist the resulting client in a ref (so rerenders don’t trigger rebuilds) and expose the resolved `accountId`.

## Agent Playbooks
- **API changes**: modify `src/useParaMiden.ts`, ensure type exports stay stable, update README docs, and consider version bump.
- **New config surface**: extend the hook signature (e.g., accept `opts` bag), forward through to `createParaMidenClient`, and document defaults.
- **Testing/validation**: this package currently relies on example usage; if adding complex logic, consider lightweight React Testing Library hooks tests (not yet present).
- **Release hygiene**: confirm `peerDependencies` stay aligned with upstream (`miden-para`, Para SDKs, React). Breaking Para/Miden API changes should trigger a major/minor release here too.

## External Contracts
- `@getpara/react-sdk` — supplies `useClient`, `useAccount`, `useWallet`, and Para configuration context. Hook must only run when `useAccount().isConnected` is true.
- `miden-para` — root SDK; `createParaMidenClient` handles modal UX and signing. Ensure versions stay compatible (`peerDependencies` enforce `^0.10.7`+).
- `@demox-labs/miden-sdk` — dynamically imported for runtime helpers like `AccountType`. Keep it externalized to avoid bundling WASM assets.
