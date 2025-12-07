import {
  hexStringToBase64,
  ParaWeb,
  SuccessfulSignatureRes,
  Wallet,
} from '@getpara/web-sdk';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js';
import {
  accountSeedFromStr,
  evmPkToCommitment,
  fromHexSig,
  getUncompressedPublicKeyFromWallet,
} from './utils.js';
import { MidenAccountOpts, Opts } from './types.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { showAccountSelectionModal, showSigningModal } from './modalClient.js';

/**
 * Creates a signing callback that routes Miden signing requests through Para.
 * Prompts the user with a modal before delegating the keccak-hashed message to Para's signer.
 */
export const signCb = (para: ParaWeb, wallet: Wallet) => {
  return async (_: Uint8Array, signingInputs: Uint8Array) => {
    const { SigningInputs } = await import('@demox-labs/miden-sdk');
    const inputs = SigningInputs.deserialize(signingInputs);
    let commitment = inputs.toCommitment().toHex().slice(2);
    const hashed = bytesToHex(keccak256(hexToBytes(commitment)));
    const confirmed = await showSigningModal(hashed);
    if (!confirmed) {
      throw new Error('User cancelled signing');
    }
    const res = await para.signMessage({
      walletId: wallet.id,
      messageBase64: hexStringToBase64(hashed),
    });
    const signature = (res as SuccessfulSignatureRes).signature;
    const sig = fromHexSig(signature);
    return sig;
  };
};

/**
 * Ensures a Miden account exists for the given Para wallet public key.
 * Attempts to import an existing account for public/network modes before creating a new one.
 */
async function createAccount(
  midenClient: import('@demox-labs/miden-sdk').WebClient,
  publicKey: string,
  opts: MidenAccountOpts
) {
  const { AccountBuilder, AccountComponent, AccountStorageMode } =
    await import('@demox-labs/miden-sdk');

  await midenClient.syncState();
  let pkc = await evmPkToCommitment(publicKey);
  // create a new account
  const accountBuilder = new AccountBuilder(
    accountSeedFromStr(opts.accountSeed) ?? new Uint8Array(32).fill(0)
  );

  let accountStorageMode;

  if (opts.storageMode === 'public') {
    accountStorageMode = AccountStorageMode.public();
  } else if (opts.storageMode === 'private') {
    accountStorageMode = AccountStorageMode.private();
  } else {
    accountStorageMode = AccountStorageMode.network();
  }

  const account = accountBuilder
    .withAuthComponent(
      AccountComponent.createAuthComponentFromCommitment(pkc, 1)
    )
    .accountType(opts.type)
    .storageMode(accountStorageMode)
    .withBasicWalletComponent()
    .build().account;

  // If the account already exists on-chain (e.g. public/network), hydrate it instead of
  // recreating a “new” account with zero commitment, which causes submission to fail.
  if (opts.storageMode !== 'private') {
    try {
      await midenClient.importAccountById(account.id());
    } catch {
      // Import will fail for non-existent accounts; fall through to creation path.
    }
  }

  // check if account exists locally after the import attempt
  const existing = await midenClient.getAccount(account.id());
  if (!existing) {
    await midenClient.newAccount(account, false);
  }
  await midenClient.syncState();
  return account.id().toString();
}

/**
 * Builds a Miden WebClient wired to Para wallets and ensures an account exists for the user.
 * Filters to EVM wallets, prompts for selection, creates the external keystore client, and
 * hydrates or creates the corresponding Miden account before returning the client + account id.
 */
export async function createParaMidenClient(
  para: ParaWeb,
  wallets: Wallet[],
  opts: Opts
) {
  const evmWallets = wallets.filter((wallet) => wallet.type === 'EVM');

  if (!evmWallets?.length) {
    throw new Error('No EVM wallets provided');
  }

  const accountKeys = await Promise.all(
    evmWallets.map((w) => getUncompressedPublicKeyFromWallet(para, w))
  );
  const selectedIndex = await showAccountSelectionModal(accountKeys);
  const wallet = evmWallets[selectedIndex] ?? evmWallets[0];
  const publicKey = accountKeys[selectedIndex] ?? accountKeys[0];

  const { WebClient } = await import('@demox-labs/miden-sdk');
  // SDK typings currently miss createClientWithExternalKeystore, so cast to any here.
  const createClientWithExternalKeystore = (
    WebClient as unknown as {
      createClientWithExternalKeystore: (...args: any[]) => Promise<any>;
    }
  ).createClientWithExternalKeystore;
  if (opts.storageMode === 'private' && !opts.accountSeed) {
    throw new Error('accountSeed is required when using private storage mode');
  }
  const noteTransportUrl =
    opts.noteTransportUrl ||
    opts.nodeTransportUrl ||
    'https://transport.miden.io';
  const client = await createClientWithExternalKeystore(
    opts.endpoint,
    noteTransportUrl,
    opts.seed,
    undefined,
    undefined,
    signCb(para, wallet)
  );
  const accountId = await createAccount(
    client,
    publicKey,
    opts as MidenAccountOpts
  );
  return { client, accountId };
}
