# Miden Para Integration

React app integrating Miden blockchain with Para embedded wallets.

## Setup

```bash
pnpm install
```

Create `.env`:

```
VITE_PARA_API_KEY=your_api_key
```

Run:

```bash
pnpm dev
```

## Using miden-para-react

### 1. Wrap app with ParaProvider

```tsx
import { ParaProvider, Environment } from "@getpara/react-sdk";

<ParaProvider
  paraClientConfig={{
    env: Environment.BETA,
    apiKey: import.meta.env.VITE_PARA_API_KEY,
  }}
  config={{ appName: "Your App Name" }}
>
  <App />
</ParaProvider>;
```

### 2. Use the hook

```tsx
import { useParaMiden } from "miden-para-react";

function App() {
  const { client, accountId } = useParaMiden(
    "https://rpc.testnet.miden.io", // RPC endpoint
    "public", // storage mode: "public" | "private"
    {
      accountSeed: "hello world", // seed for account generation
      noteTransportUrl: "https://transport.miden.io",
    }
  );

  // client: Miden WebClient instance
  // accountId: Account ID (hex format)
}
```

### 3. Use the client

```tsx
// Mint tokens
const mintTxRequest = client.newMintTransactionRequest(
  toAccountId,
  faucetId,
  NoteType.Public,
  amount
);
await client.submitNewTransaction(faucetId, mintTxRequest);

// Send tokens
const sendTxRequest = client.newSendTransactionRequest(
  fromAccountId,
  toAccountId,
  faucetId,
  NoteType.Private,
  amount
);
const executedTx = await client.executeTransaction(
  fromAccountId,
  sendTxRequest
);
const provenTx = await client.proveTransaction(executedTx);
await client.submitProvenTransaction(provenTx, executedTx);

// Get balance
await client.syncState();
const account = await client.getAccount(accountId);
const assets = account.vault().fungibleAssets();
```

- Para handles wallet authentication and signing
- `useParaMiden` returns a configured Miden client that works with Para wallets
- All Miden SDK operations work as normal after getting the client
- Account ID is in hex format, convert to Bech32 for display
