# Next/React Integration

For react you can use this hook. Create a `use-miden.ts` and paste the following code:

```typescript
'use client';

import { useClient, useAccount, Wallet } from '@getpara/react-sdk';
import { createParaMidenClient } from 'miden-para';
import { useEffect, useRef, useState } from 'react';

export function useMiden(nodeUrl?: string) {
  const para = useClient();
  const { isConnected, embedded } = useAccount();
  const clientRef = useRef<import('@demox-labs/miden-sdk').WebClient | null>(
    null
  );
  const [accountId, setAccountId] = useState<string>('');

  // Filter for EVM-compatible wallets
  const evmWallets = embedded.wallets?.filter((w) => w.type === 'EVM');

  useEffect(() => {
    async function setupClient() {
      if (isConnected && evmWallets && para) {
        const { AccountType, AccountStorageMode } =
          await import('@demox-labs/miden-sdk');

        const { client: midenParaClient, accountId: aId } =
          await createParaMidenClient(para, evmWallets[0] as Wallet, {
            endpoint: nodeUrl,
            type: AccountType.RegularAccountImmutableCode,
            storageMode: 'private',
          });

        clientRef.current = midenParaClient;
        setAccountId(aId);
      }
    }
    setupClient();
  }, [isConnected, evmWallets, para, nodeUrl]);
  return { client: clientRef.current, accountId };
}
```

and wherever you use the `Webclient` you can either initialise using the hook or call `createParaMidenClient` instead.

For example the following components consumes all the notes avaialble for the logged in user:

```typescript
function ConsumeAllNotes() {
  const { openModal } = useModal();
  const { isConnected, embedded } = useAccount();
  const { data: wallet } = useWallet();
  // Create the miden client the default node endpoint is testnet
  const { client, accountId } = useMiden();

  const consumeAllNotes = async () => {
    const { WebClient, AccountId } = await import("@demox-labs/miden-sdk");
    // to get typings
    if (!(client instanceof WebClient)) {
        return;
    }
    await client.syncState();
    let aId = AccountId.fromHex(accountId);
    const mintedNotes = await client.getConsumableNotes(aId);
    const mintedNoteIds = mintedNotes.map((n) =>
        n.inputNoteRecord().id().toString()
    );
    console.log("Minted Note Ids:", mintedNoteIds)
    const consumeTxRequest = client.newConsumeTransactionRequest(mintedNoteIds);
    aId = AccountId.fromHex(accountId);
    const txId = await client.submitNewTransaction(aId, consumeTxRequest);
    console.log("Notes consumed.", txId.toHex())
  };


  return (
    <div>
      {!isConnected ? (
        <button onClick={() => openModal()}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {wallet?.address}</p>
        </div>
      )}

      <button onClick={consumeAllNotes}> ConsumeNotes </button>
    </div>
  );
}
```
