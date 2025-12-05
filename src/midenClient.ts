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
import { showSigningModal } from './modalClient.js';

/// Create a signing callback for the externalkeystore
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
  // check if account exists
  const existing = await midenClient.getAccount(account.id());
  if (!existing) {
    // insert the account if it does not exist
    await midenClient.newAccount(account, false);
  }
  await midenClient.syncState();
  return account.id().toString();
}

export async function createParaMidenClient(
  para: ParaWeb,
  wallet: Wallet,
  opts: Opts
) {
  let publicKey = await getUncompressedPublicKeyFromWallet(para, wallet);
  const { WebClient } = await import('@demox-labs/miden-sdk');
  // SDK typings currently miss createClientWithExternalKeystore, so cast to any here.
  const createClientWithExternalKeystore = (
    WebClient as unknown as {
      createClientWithExternalKeystore: (...args: any[]) => Promise<any>;
    }
  ).createClientWithExternalKeystore;
  const client = await createClientWithExternalKeystore(
    opts.endpoint,
    opts.nodeTransportUrl,
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
