'use client';

import { useClient, useAccount, type Wallet } from '@getpara/react-sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createParaMidenClient } from 'miden-para';
import { AccountStorageMode } from '@demox-labs/miden-sdk';

export function useParaMiden(
  nodeUrl: string,
  storageMode: AccountStorageMode = AccountStorageMode.public()
) {
  const para = useClient();
  const { isConnected, embedded } = useAccount();
  const clientRef = useRef<import('@demox-labs/miden-sdk').WebClient | null>(
    null,
  );
  const [accountId, setAccountId] = useState<string>('');

  const evmWallets = useMemo(
    () => embedded.wallets?.filter((wallet) => wallet.type === 'EVM'),
    [embedded.wallets],
  );

  useEffect(() => {
    let cancelled = false;

    async function setupClient() {
      if (!isConnected || !para || !evmWallets?.length || clientRef.current) {
        return;
      }

      const { AccountType } = await import('@demox-labs/miden-sdk');

      const { client: midenParaClient, accountId: aId } =
        await createParaMidenClient(para, evmWallets[0] as Wallet, {
          endpoint: nodeUrl,
          type: AccountType.RegularAccountImmutableCode,
          storageMode: storageMode,
        });

      if (cancelled) {
        return;
      }

      clientRef.current = midenParaClient;
      setAccountId(aId);
    }

    setupClient();

    return () => {
      cancelled = true;
    };
  }, [isConnected, evmWallets, para, nodeUrl]);

  return { client: clientRef.current, accountId, para, evmWallets, nodeUrl };
}
