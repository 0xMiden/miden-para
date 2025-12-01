import { hexStringToBase64, ParaWeb, SuccessfulSignatureRes, Wallet } from '@getpara/web-sdk';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { evmPkToCommitment, fromHexSig } from './utils.js';
import { jwtDecode } from 'jwt-decode';
import { MidenAccountOpts, MidenClientOpts, Opts } from './types.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

/// Create a signing callback for the externalkeystore
export const signCb = (para: ParaWeb, wallet: Wallet) => {
  return async (publicKeyCommitment: Uint8Array, signingInputs: Uint8Array) => {
    const { SigningInputs } = await import('@demox-labs/miden-sdk');
    const inputs = SigningInputs.deserialize(signingInputs);
    // turn the singing inputs to commitment and then to hex without the '0x'
    let commitment = inputs.toCommitment().toHex().slice(2);
    const hashed = bytesToHex(keccak_256(hexToBytes(commitment)));
    const res = await para.signMessage({
      walletId: wallet.id,
      messageBase64: hexStringToBase64(hashed),
    });
    const signature = (res as SuccessfulSignatureRes).signature;
    const sig = fromHexSig(signature);
    return sig;
  };
};

async function createAccount(midenClient: any, publicKey: string, opts: MidenAccountOpts) {
  const { AccountBuilder, AccountComponent } = await import('@demox-labs/miden-sdk');

  let pkc = await evmPkToCommitment(publicKey);

  // create a new account
  const accountBuilder = new AccountBuilder(new Uint8Array(32).fill(0));

  const account = accountBuilder
    .withAuthComponent(AccountComponent.createAuthComponentFromCommitment(pkc, 1))
    .accountType(opts.type)
    .storageMode(opts.storageMode)
    .withBasicWalletComponent()
    .build().account;

  await midenClient.newAccount(account, true);
  await midenClient.synsState();
  return account.id().toString();
}

export async function createParaMidenClient(para: ParaWeb, wallet: Wallet, opts: Opts) {
  let publicKey = wallet.publicKey;

  if (!!wallet.publicKey) {
    const { token } = await para.issueJwt();
    //@ts-ignore
    const wallets = jwtDecode(token)?.data.connectedWallets;
    const w = wallets.find((w: any) => w.id == wallet.id);
    if (!w) {
      throw new Error('Wallet Not Found in jwt data');
    }
    publicKey = w.publicKey;
  }
  const { WebClient } = await import('@demox-labs/miden-sdk');

  const client = await WebClient.createClientWithExternalKeystore(
    opts.endpoint,
    opts.nodeTransportUrl,
    opts.seed,
    undefined,
    undefined,
    signCb(para, wallet),
  );
  const accountId = await createAccount(client, publicKey, opts as MidenAccountOpts);
  return { client, accountId };
}
