import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { ParaWeb, type Wallet, type Environment } from '@getpara/web-sdk';
import { SignerContext, type SignerContextValue } from '@miden-sdk/react';
import { signCb as createSignCb, type CustomSignConfirmStep } from './midenClient.js';
import { evmPkToCommitment, getUncompressedPublicKeyFromWallet } from './utils.js';

// PARA SIGNER PROVIDER
// ================================================================================================

export interface ParaSignerProviderProps {
  children: ReactNode;
  /** Para API key */
  apiKey: string;
  /** Para environment (PRODUCTION, DEVELOPMENT, SANDBOX) */
  environment: Environment;
  /** Whether to show the signing modal for transaction confirmation */
  showSigningModal?: boolean;
  /** Custom sign confirmation step callback */
  customSignConfirmStep?: CustomSignConfirmStep;
}

/**
 * Para-specific extras exposed via useParaSigner hook.
 */
export interface ParaSignerExtras {
  /** Para client instance */
  para: ParaWeb;
  /** Connected wallet (null if not connected) */
  wallet: Wallet | null;
}

const ParaSignerExtrasContext = createContext<ParaSignerExtras | null>(null);

/**
 * ParaSignerProvider wraps MidenProvider to enable Para wallet signing.
 *
 * @example
 * ```tsx
 * <ParaSignerProvider apiKey="your-api-key" environment="PRODUCTION">
 *   <MidenProvider config={{ rpcUrl: "testnet" }}>
 *     <App />
 *   </MidenProvider>
 * </ParaSignerProvider>
 * ```
 */
export function ParaSignerProvider({
  children,
  apiKey,
  environment,
  showSigningModal = true,
  customSignConfirmStep,
}: ParaSignerProviderProps) {
  // Create Para client once (stable instance)
  const para = useMemo(
    () => new ParaWeb({ apiKey, environment }),
    [apiKey, environment]
  );

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check connection status on mount and periodically
  useEffect(() => {
    let cancelled = false;

    async function checkConnection() {
      try {
        const isLoggedIn = await para.isFullyLoggedIn();
        if (!isLoggedIn || cancelled) {
          setIsConnected(false);
          setWallet(null);
          return;
        }

        const wallets = Object.values(await para.getWallets());
        const evmWallets = wallets.filter((w) => w.type === 'EVM');

        if (evmWallets.length > 0 && !cancelled) {
          setWallet(evmWallets[0]);
          setIsConnected(true);
        } else if (!cancelled) {
          setIsConnected(false);
          setWallet(null);
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          setWallet(null);
        }
      }
    }

    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [para]);

  // Connect/disconnect methods (stable references)
  const connect = useCallback(async () => {
    await para.connect();
  }, [para]);

  const disconnect = useCallback(async () => {
    await para.logout();
    setIsConnected(false);
    setWallet(null);
  }, [para]);

  // Build signer context (includes connect/disconnect for unified useSigner hook)
  const [signerContext, setSignerContext] = useState<SignerContextValue | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function buildContext() {
      if (!isConnected || !wallet) {
        // Not connected - provide context with connect/disconnect but no signing capability
        setSignerContext({
          signCb: async () => {
            throw new Error('Para wallet not connected');
          },
          accountConfig: null as any,
          storeName: '',
          name: 'Para',
          isConnected: false,
          connect,
          disconnect,
        });
        return;
      }

      try {
        // Connected - build full context with signing capability
        const publicKey = await getUncompressedPublicKeyFromWallet(para, wallet);
        const commitment = await evmPkToCommitment(publicKey);

        // Serialize the commitment Word to Uint8Array for SignerAccountConfig
        const commitmentBytes = commitment.serialize();

        const signCallback = createSignCb(
          para,
          wallet,
          showSigningModal,
          customSignConfirmStep
        );

        if (!cancelled) {
          const { AccountType, AccountStorageMode } = await import(
            '@demox-labs/miden-sdk'
          );

          setSignerContext({
            signCb: signCallback,
            accountConfig: {
              publicKeyCommitment: commitmentBytes,
              accountType: 'RegularAccountImmutableCode',
              storageMode: AccountStorageMode.public(),
            },
            storeName: `para_${wallet.id}`,
            name: 'Para',
            isConnected: true,
            connect,
            disconnect,
          });
        }
      } catch (error) {
        console.error('Failed to build Para signer context:', error);
        if (!cancelled) {
          setSignerContext({
            signCb: async () => {
              throw new Error('Para wallet not connected');
            },
            accountConfig: null as any,
            storeName: '',
            name: 'Para',
            isConnected: false,
            connect,
            disconnect,
          });
        }
      }
    }

    buildContext();
    return () => {
      cancelled = true;
    };
  }, [
    isConnected,
    wallet,
    para,
    showSigningModal,
    customSignConfirmStep,
    connect,
    disconnect,
  ]);

  return (
    <ParaSignerExtrasContext.Provider value={{ para, wallet }}>
      <SignerContext.Provider value={signerContext}>
        {children}
      </SignerContext.Provider>
    </ParaSignerExtrasContext.Provider>
  );
}

/**
 * Hook for Para-specific extras beyond the unified useSigner interface.
 * Use this to access the Para client or wallet details directly.
 *
 * @example
 * ```tsx
 * const { para, wallet, isConnected } = useParaSigner();
 * ```
 */
export function useParaSigner(): ParaSignerExtras & { isConnected: boolean } {
  const extras = useContext(ParaSignerExtrasContext);
  const signer = useContext(SignerContext);
  if (!extras) {
    throw new Error('useParaSigner must be used within ParaSignerProvider');
  }
  return { ...extras, isConnected: signer?.isConnected ?? false };
}
