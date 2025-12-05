# Integrations

## High Level Overview

1. **Para Wallet Setup**: First, set up Para in your application. Follow the [Para quickstart guide](https://docs.getpara.com/v2/react/quickstart) to integrate Para into your app.

2. **Miden Client Creation**:

```bash
npm install miden-para @getpara/web-sdk
```

Use the `createParaMidenClient` function from `'miden-para'` to create a Miden `WebClient`:

```typescript
import { ParaWeb } from '@getpara/web-sdk'; // or your framework's sdk
import { createParaMidenClient } from 'miden-para';

const PARA_API_KEY = import.meta.env.VITE_PARA_API_KEY;
export const para = new ParaWeb(PARA_API_KEY);

// create a WebClient instace
const { client: midenParaClient, accountId } = await createParaMidenClient(
  para, // the ParaWeb instance from the para sdk
  connectedEvmWallet as Wallet, // get the connected wallet through para sdk in react use `useAccount`
  {
    endpoint: nodeUrl,
    type: AccountType.RegularAccountImmutableCode,
    storageMode: AccountStorageMode.private(),
  },
);

// use it as the normal `WebClient` instance
await midenParaClient.syncState();
```

3. **Miden Operations**: With the returned `WebClient` instance, you can perform all standard Miden operations:
   - Execute transactions
   - Manage notes and assets

   For detailed documentation on using the `WebClient`, see the [Miden Web Client tutorial](https://docs.miden.xyz/miden-tutorials/web-client/about).

**Framework-specific guides:**

- [React/Next Integration Guide](./REACT.md)

---
