# miden-para-react

React hook that wires Para accounts into a Miden client.

## Install

```bash
npm install miden-para-react
```

Peer deps you must also provide: `react`, `@getpara/react-sdk`, `miden-para`, `@demox-labs/miden-sdk`.

## Usage

```tsx
import { ParaProvider } from '@getpara/react-sdk';
import { useParaMiden } from 'miden-para-react';

function App() {
  const { client, accountId } = useParaMiden(
    'https://miden-node.yourdomain.com',
  );

  return (
    <ParaProvider appId="your-app-id">
      <div>
        <p>Account: {accountId}</p>
        <p>Client ready: {Boolean(client) ? 'yes' : 'no'}</p>
      </div>
    </ParaProvider>
  );
}
```

## Build

```bash
npm run build
```

Outputs `dist/index.mjs`, `dist/index.cjs`, and `dist/index.d.ts`. Use `npm pack` to inspect the tarball before publishing.
