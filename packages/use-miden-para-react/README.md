# miden-para-react

React hook that wires Para accounts into a Miden client.

## Install

```bash
npm install miden-para-react
```

## Peer Dependencies

`miden-para-react` expects these packages to be provided by the consuming app. Install matching versions alongside this package to avoid duplicate copies:

- `@demox-labs/miden-sdk@^0.12.5`
- `@getpara/react-sdk@^2.0.0-alpha.73`
- `miden-para@^0.10.4`
- `react@^18.0.0 || ^19.0.0`

Example install:

```bash
yarn add miden-para-react @demox-labs/miden-sdk@^0.12.5 @getpara/react-sdk@^2.0.0-alpha.73 miden-para@^0.10.4 react@^18.0.0
```

## Usage

```tsx
import '@getpara/react-sdk/styles.css';
import { ParaProvider, useAccount, useModal } from '@getpara/react-sdk';
import { useParaMiden } from 'miden-para-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: import.meta.env.VITE_PARA_API_KEY,
        }}
        config={{ appName: 'Starter for MidenxPara' }}
      >
        <Content />
      </ParaProvider>
    </QueryClientProvider>
  );
}

function Content() {
  const { client, accountId } = useParaMiden('https://rpc.testnet.miden.io');
  const { isConnected } = useAccount();
  const { openModal } = useModal();

  return (
    <div>
      {!isConnected ? (
        <button onClick={() => openModal?.()}>
          Connect with Para
        </button>
      ) : (
        <>
          <p>Account: {accountId ?? '—'}</p>
          <p>Client ready: {client ? 'yes' : 'no'}</p>
        </>
      )}
    </div>
  );
}
```

If you switch the hook to `storageMode` set to `private`, pass an `accountSeed` via the third argument so the underlying client can initialize; this is required for private accounts and the hook will throw if it is omitted.

## Build

```bash
npm run build
```

Outputs `dist/index.mjs`, `dist/index.cjs`, and `dist/index.d.ts`. Use `npm pack` to inspect the tarball before publishing.
