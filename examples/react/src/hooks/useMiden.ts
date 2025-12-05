'use client';

import { useClient, useAccount, type Wallet } from '@getpara/react-sdk';
import { createParaMidenClient } from 'miden-para';
import { useEffect, useRef, useState } from 'react';

export function useMiden(nodeUrl?: string) {
  const para = useClient();
  const { isConnected, embedded } = useAccount();
  const clientRef = useRef<import('@demox-labs/miden-sdk').WebClient | null>(
    null,
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
            storageMode: AccountStorageMode.private(),
          });

        clientRef.current = midenParaClient;
        setAccountId(aId);
      }
    }
    setupClient();
  }, [isConnected, evmWallets, para, nodeUrl]);
  return { client: clientRef.current, accountId, para, evmWallets, nodeUrl };
}
