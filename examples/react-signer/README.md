# Miden Para Signer Example

This example demonstrates how to use `ParaSignerProvider` with `MidenProvider` from `@miden-sdk/react` to enable Para wallet signing in a React application.

## Prerequisites

- Node.js 18+
- A Para API key (get one from [developer.getpara.com](https://developer.getpara.com))
- Local builds of:
  - `~/miden/miden-client/packages/react-sdk` (must export `SignerContext`)
  - `~/miden/miden-client/crates/web-client`

## Setup

1. Copy the environment file and add your Para API key:

```bash
cp .env.example .env
# Edit .env and add your VITE_PARA_API_KEY
```

2. Build the local dependencies:

```bash
# Build the miden-sdk
cd ~/miden/miden-client/crates/web-client
yarn && yarn build

# Build the react-sdk
cd ~/miden/miden-client/packages/react-sdk
yarn && yarn build

# Build miden-para
cd ~/miden/miden-para
yarn && yarn build
```

3. Install and run:

```bash
cd examples/react-signer
yarn install
yarn dev
```

## Architecture

The app demonstrates the unified signer pattern:

```tsx
<ParaProvider>
  <ParaSignerProvider signerContext={SignerContext}>
    <MidenProvider>
      <App />
    </MidenProvider>
  </ParaSignerProvider>
</ParaProvider>
```

- **ParaProvider**: Handles Para authentication UI (from `@getpara/react-sdk-lite`)
- **ParaSignerProvider**: Bridges Para wallet to the unified signer interface
- **MidenProvider**: Detects the signer context and uses external keystore mode
- **SignerContext**: Shared between ParaSignerProvider and MidenProvider

## Hooks Used

- `useSigner()` - Get the unified signer interface (from `@miden-sdk/react`)
- `useParaSigner()` - Get Para-specific extras (para client, wallet)
- `useMiden()` - Get the Miden client state and signer account ID
- `useAccount()` - Get account details for the signer account
- `useSyncState()` - Monitor sync state

## Notes

- This example requires the unreleased `SignerContext` feature from `@miden-sdk/react`
- The `signerContext` prop must be passed to both `ParaSignerProvider` and `useParaSigner` for proper integration
