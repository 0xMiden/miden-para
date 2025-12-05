# miden-para

This is the Miden x Para SDK integration. Below, you'll find instructions for local building and linking the library. If you're looking for React integration, see [Miden x Para x React](./packages/use-miden-para-react/README.md).

## Requirements

- **Yarn 1.22.22** (enforced via `packageManager` field)
- Node.js (compatible with your project)

This project uses Yarn 1.22.22. The version is locked in `package.json` and will be automatically enforced by modern package managers that support the `packageManager` field.

## Peer Dependencies

`miden-para` expects these packages to be provided by the consuming app. Install matching versions alongside this package to avoid duplicate copies:

- `@demox-labs/miden-sdk@^0.12.5`
- `@getpara/web-sdk@2.0.0-alpha.73`

Example install:

```bash
yarn add miden-para @demox-labs/miden-sdk@^0.12.5 @getpara/web-sdk@2.0.0-alpha.73
```

## Installation

```bash
yarn install
```

## Building

```bash
yarn build
```

## Publishing to npm

1. Update the version in `package.json` (the published package is `miden-para`).
2. Authenticate with npm if needed: `npm login`.
3. Publish: `npm run publish`. The `prepack` hook rebuilds `dist/` and the `postpack` hook moves the generated tarball into `build/`.
4. (Optional) Inspect the packed artifact without publishing via `npm pack` and check `build/` for the resulting `miden-para-<version>.tgz`.
