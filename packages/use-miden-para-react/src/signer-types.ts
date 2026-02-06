/**
 * Local type definitions for @miden-sdk/react signer types.
 * These types are defined in @miden-sdk/react but may not yet be published.
 * Once they are available in the published package, this file can be removed
 * and imports updated to use '@miden-sdk/react' directly.
 */
import { createContext, useContext } from 'react';

export type SignCallback = (
  pubKey: Uint8Array,
  signingInputs: Uint8Array
) => Promise<Uint8Array>;

export type SignerAccountType =
  | 'RegularAccountImmutableCode'
  | 'RegularAccountUpdatableCode'
  | 'FungibleFaucet'
  | 'NonFungibleFaucet';

export interface SignerAccountConfig {
  publicKeyCommitment: Uint8Array;
  accountType: SignerAccountType;
  storageMode: any;
  accountSeed?: Uint8Array;
}

export interface SignerContextValue {
  signCb: SignCallback;
  accountConfig: SignerAccountConfig;
  storeName: string;
  name: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const SignerContext = createContext<SignerContextValue | null>(null);
