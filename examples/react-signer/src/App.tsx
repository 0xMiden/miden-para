import { useSigner, useMiden, useAccount, useSyncState } from '@miden-sdk/react';
import { useParaSigner } from '@miden-sdk/use-miden-para-react';

function App() {
  // Get signer context (from ParaSignerProvider)
  const signer = useSigner();

  // Get Para-specific extras
  const { para, wallet, isConnected: paraConnected } = useParaSigner();

  // Get Miden client state
  const { isReady, isInitializing, error, signerAccountId, sync } = useMiden();

  // Get sync state
  const { syncHeight, isSyncing, lastSyncTime } = useSyncState();

  // Get account details when we have a signer account
  const accountResult = useAccount(signerAccountId ?? undefined);

  const handleConnect = async () => {
    if (signer?.isConnected) {
      await signer.disconnect();
    } else {
      await signer?.connect();
    }
  };

  const handleSync = async () => {
    await sync();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Miden + Para Integration</h1>
        <p style={styles.subtitle}>
          Using ParaSignerProvider with MidenProvider
        </p>

        {/* Connection Status */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Connection Status</h2>
          <StatusRow label="Para Connected" value={paraConnected ? 'Yes' : 'No'} />
          <StatusRow label="Signer Name" value={signer?.name ?? 'None'} />
          <StatusRow label="Miden Ready" value={isReady ? 'Yes' : 'No'} />
          <StatusRow label="Initializing" value={isInitializing ? 'Yes' : 'No'} />
          {error && <StatusRow label="Error" value={error.message} isError />}
        </div>

        {/* Wallet Info */}
        {wallet && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Para Wallet</h2>
            <StatusRow label="Wallet ID" value={wallet.id} />
            <StatusRow label="Address" value={wallet.address ?? 'N/A'} truncate />
            <StatusRow label="Type" value={wallet.type} />
          </div>
        )}

        {/* Miden Account */}
        {signerAccountId && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Miden Account</h2>
            <StatusRow label="Account ID" value={signerAccountId} truncate />
            {accountResult.account && (
              <>
                <StatusRow
                  label="Nonce"
                  value={accountResult.account.nonce().toString()}
                />
                <StatusRow
                  label="Is Faucet"
                  value={accountResult.account.isFaucet() ? 'Yes' : 'No'}
                />
              </>
            )}
          </div>
        )}

        {/* Sync State */}
        {isReady && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Sync State</h2>
            <StatusRow label="Block Height" value={syncHeight.toString()} />
            <StatusRow label="Syncing" value={isSyncing ? 'Yes' : 'No'} />
            <StatusRow
              label="Last Sync"
              value={lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
            />
          </div>
        )}

        {/* Asset Balances */}
        {accountResult.assets.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Balances</h2>
            {accountResult.assets.map((asset) => (
              <StatusRow
                key={asset.assetId}
                label={asset.symbol ?? 'Asset'}
                value={`${asset.amount.toString()} (${truncate(asset.assetId, 16)})`}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={styles.buttonGroup}>
          <button
            style={signer?.isConnected ? styles.buttonSecondary : styles.button}
            onClick={handleConnect}
          >
            {signer?.isConnected ? 'Disconnect' : 'Connect with Para'}
          </button>

          {isReady && (
            <button
              style={styles.buttonSecondary}
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          )}
        </div>

        {/* Debug Info */}
        <details style={styles.debug}>
          <summary style={styles.debugSummary}>Debug Info</summary>
          <pre style={styles.debugContent}>
            {JSON.stringify({
              paraConnected,
              signerConnected: signer?.isConnected,
              signerName: signer?.name,
              isReady,
              isInitializing,
              signerAccountId,
              walletId: wallet?.id,
              walletAddress: wallet?.address,
              paraInstance: !!para,
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  isError = false,
  truncate: shouldTruncate = false
}: {
  label: string;
  value: string;
  isError?: boolean;
  truncate?: boolean;
}) {
  const displayValue = shouldTruncate ? truncate(value, 24) : value;
  return (
    <div style={styles.statusRow}>
      <span style={styles.statusLabel}>{label}:</span>
      <span style={{
        ...styles.statusValue,
        ...(isError ? styles.errorText : {})
      }}>
        {displayValue}
      </span>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#666',
    marginBottom: '1.5rem',
  },
  section: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ff5500',
    marginBottom: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.25rem 0',
    borderBottom: '1px solid #eee',
  },
  statusLabel: {
    color: '#666',
    fontSize: '0.875rem',
  },
  statusValue: {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right' as const,
    wordBreak: 'break-all' as const,
  },
  errorText: {
    color: '#dc3545',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  button: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white',
    background: '#ff5500',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ff5500',
    background: 'white',
    border: '2px solid #ff5500',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  debug: {
    marginTop: '1.5rem',
    padding: '0.5rem',
    background: '#f1f1f1',
    borderRadius: '4px',
  },
  debugSummary: {
    cursor: 'pointer',
    color: '#666',
    fontSize: '0.75rem',
  },
  debugContent: {
    marginTop: '0.5rem',
    fontSize: '0.7rem',
    overflow: 'auto',
    maxHeight: '200px',
  },
};

export default App;
