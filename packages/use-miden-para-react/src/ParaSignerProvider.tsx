import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { ParaWeb, Environment, type Wallet } from '@getpara/web-sdk';
import {
  ParaProvider,
  useClient,
  useModal,
  useLogout,
  type ParaProviderProps,
} from '@getpara/react-sdk-lite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignerContext, type SignerContextValue } from '@miden-sdk/react';
import { signCb as createSignCb, type CustomSignConfirmStep } from '@miden-sdk/miden-para';
import { evmPkToCommitment, getUncompressedPublicKeyFromWallet } from '@miden-sdk/miden-para';

// Re-export Para hooks for convenience
export { useModal, useLogout } from '@getpara/react-sdk-lite';

const defaultQueryClient = new QueryClient();

// PARA SIGNER PROVIDER
// ================================================================================================

/** Environment string values accepted by ParaSignerProvider */
export type ParaEnvironment = 'BETA' | 'PROD' | 'SANDBOX' | 'DEV' | 'DEVELOPMENT' | 'PRODUCTION';

/**
 * Convert environment string to Environment enum value.
 * Handles the mapping safely for both ESM and CJS environments.
 */
function getEnvironmentValue(env: ParaEnvironment): Environment {
  // Handle aliases
  const normalizedEnv = env === 'DEVELOPMENT' ? 'BETA' : env === 'PRODUCTION' ? 'PROD' : env;

  // Try accessing the enum - Environment may be undefined in some test environments
  if (Environment && typeof Environment === 'object') {
    const value = Environment[normalizedEnv as keyof typeof Environment];
    if (value !== undefined) return value;
  }

  // Fallback: return the string directly (Para SDK may accept string values)
  return normalizedEnv as unknown as Environment;
}

export interface ParaSignerProviderProps {
  children: ReactNode;
  /** Para API key */
  apiKey: string;
  /** Para environment (BETA, PROD, SANDBOX, DEV, DEVELOPMENT, PRODUCTION) */
  environment: ParaEnvironment;
  /** App name displayed in Para modal */
  appName?: string;
  /** Whether to show the signing modal for transaction confirmation */
  showSigningModal?: boolean;
  /** Custom sign confirmation step callback */
  customSignConfirmStep?: CustomSignConfirmStep;
  /**
   * Optional custom QueryClient instance for React Query.
   * If not provided, a default instance is used internally.
   */
  queryClient?: QueryClient;
  /**
   * Advanced: Additional config to pass to ParaProvider.
   * Use this for customizing OAuth methods, external wallets, etc.
   */
  paraProviderConfig?: Partial<Omit<ParaProviderProps<any, any>, 'children' | 'paraClientConfig'>>;
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
 * Includes ParaProvider internally, so you don't need to wrap with it separately.
 *
 * @example
 * ```tsx
 * <ParaSignerProvider apiKey="your-api-key" environment="BETA" appName="My App">
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
  appName = 'Miden App',
  showSigningModal = true,
  customSignConfirmStep,
  queryClient,
  paraProviderConfig,
}: ParaSignerProviderProps) {
  return (
    <QueryClientProvider client={queryClient ?? defaultQueryClient}>
      <ParaProvider
        paraClientConfig={{
          env: getEnvironmentValue(environment),
          apiKey,
        }}
        config={{ appName }}
        {...paraProviderConfig}
      >
        <ParaSignerProviderInner
          showSigningModal={showSigningModal}
          customSignConfirmStep={customSignConfirmStep}
        >
          {children}
        </ParaSignerProviderInner>
      </ParaProvider>
    </QueryClientProvider>
  );
}

/**
 * Inner component that has access to ParaProvider context (useModal, etc.)
 */
function ParaSignerProviderInner({
  children,
  showSigningModal = true,
  customSignConfirmStep,
}: Pick<ParaSignerProviderProps, 'children' | 'showSigningModal' | 'customSignConfirmStep'>) {
  // Access Para modal from ParaProvider.
  // Store in refs to avoid re-render loops (these hooks return new objects each render).
  const { openModal } = useModal();
  const { logoutAsync } = useLogout();
  const openModalRef = useRef(openModal);
  const logoutAsyncRef = useRef(logoutAsync);
  useEffect(() => { openModalRef.current = openModal; }, [openModal]);
  useEffect(() => { logoutAsyncRef.current = logoutAsync; }, [logoutAsync]);

  // Get the Para client from ParaProvider context (avoids creating a duplicate instance)
  const para = useClient()!;

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

  // Connect opens the Para modal
  const connect = useCallback(async () => {
    openModalRef.current();
  }, []);

  // Disconnect logs out from Para
  const disconnect = useCallback(async () => {
    await logoutAsyncRef.current();
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
        if (!publicKey) throw new Error('Failed to get public key from wallet');
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
          const { AccountStorageMode } = await import(
            '@miden-sdk/miden-sdk'
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
