import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { ParaWeb, Environment, type Wallet } from '@getpara/web-sdk';
import { signCb as createSignCb, type CustomSignConfirmStep } from './midenClient.js';
import { evmPkToCommitment, getUncompressedPublicKeyFromWallet } from './utils.js';

// SIGNER CONTEXT TYPES
// These mirror the types from @miden-sdk/react SignerContext.
// We define them here so this package can build without requiring the
// unreleased SignerContext feature from @miden-sdk/react.
// ================================================================================================

/**
 * Sign callback for WebClient.createClientWithExternalKeystore.
 */
export type SignCallback = (
  pubKey: Uint8Array,
  signingInputs: Uint8Array
) => Promise<Uint8Array>;

/**
 * Account type for signer accounts.
 */
export type SignerAccountType =
  | 'RegularAccountImmutableCode'
  | 'RegularAccountUpdatableCode'
  | 'FungibleFaucet'
  | 'NonFungibleFaucet';

/**
 * Account configuration provided by the signer.
 */
export interface SignerAccountConfig {
  publicKeyCommitment: Uint8Array;
  accountType: SignerAccountType;
  storageMode: import('@demox-labs/miden-sdk').AccountStorageMode;
  accountSeed?: Uint8Array;
}

/**
 * Context value provided by signer providers.
 */
export interface SignerContextValue {
  signCb: SignCallback;
  accountConfig: SignerAccountConfig;
  storeName: string;
  name: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Default React context for signer - used when no external SignerContext is provided.
 * For integration with MidenProvider from @miden-sdk/react, pass the SignerContext
 * from that package via the `signerContext` prop.
 */
const DefaultSignerContext = createContext<SignerContextValue | null>(null);

// Export the context for use in other packages
export { DefaultSignerContext as SignerContext };

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
  /** Whether to show the signing modal for transaction confirmation */
  showSigningModal?: boolean;
  /** Custom sign confirmation step callback */
  customSignConfirmStep?: CustomSignConfirmStep;
  /**
   * Optional SignerContext from @miden-sdk/react.
   * Pass this when using with MidenProvider so they share the same context.
   * @example
   * ```tsx
   * import { SignerContext } from '@miden-sdk/react';
   * <ParaSignerProvider signerContext={SignerContext} ... />
   * ```
   */
  signerContext?: React.Context<SignerContextValue | null>;
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
  signerContext: SignerContextProp,
}: ParaSignerProviderProps) {
  // Use provided context or default
  const SignerContext = SignerContextProp ?? DefaultSignerContext;
  // Create Para client once (stable instance)
  const para = useMemo(
    () => new ParaWeb(getEnvironmentValue(environment), apiKey),
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
  // Note: connect is a no-op here because Para authentication is handled by
  // ParaProvider from @getpara/react-sdk-lite. Use their useModal().openModal()
  // to trigger the authentication flow.
  const connect = useCallback(async () => {
    console.warn(
      'ParaSignerProvider: connect() called but Para authentication is handled by ParaProvider. ' +
      'Use useModal().openModal() from @getpara/react-sdk-lite to connect.'
    );
  }, []);

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
 * @param signerContext - Optional SignerContext to use (pass the same one used in ParaSignerProvider)
 *
 * @example
 * ```tsx
 * // Basic usage (uses default context)
 * const { para, wallet, isConnected } = useParaSigner();
 *
 * // With custom context from @miden-sdk/react
 * import { SignerContext } from '@miden-sdk/react';
 * const { para, wallet, isConnected } = useParaSigner(SignerContext);
 * ```
 */
export function useParaSigner(
  signerContext?: React.Context<SignerContextValue | null>
): ParaSignerExtras & { isConnected: boolean } {
  const extras = useContext(ParaSignerExtrasContext);
  const SignerContext = signerContext ?? DefaultSignerContext;
  const signer = useContext(SignerContext);
  if (!extras) {
    throw new Error('useParaSigner must be used within ParaSignerProvider');
  }
  return { ...extras, isConnected: signer?.isConnected ?? false };
}
