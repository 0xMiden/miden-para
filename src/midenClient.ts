import {
  hexStringToBase64,
  ParaWeb,
  SuccessfulSignatureRes,
  Wallet,
} from "@getpara/web-sdk";
import { keccak_256 as keccak256 } from "@noble/hashes/sha3.js";
import {
  evmPkToCommitment,
  fromHexSig,
  getUncompressedPublicKeyFromWallet,
} from "./utils.js";
import { MidenAccountOpts, Opts } from "./types.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/// Create a signing callback for the externalkeystore
export const signCb = (para: ParaWeb, wallet: Wallet) => {
  return async (_: Uint8Array, signingInputs: Uint8Array) => {
    const { SigningInputs } = await import("@demox-labs/miden-sdk");
    const inputs = SigningInputs.deserialize(signingInputs);
    // turn the singing inputs to commitment and then to hex without the '0x'
    let commitment = inputs.toCommitment().toHex().slice(2);
    const hashed = bytesToHex(keccak256(hexToBytes(commitment)));
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
  midenClient: import("@demox-labs/miden-sdk").WebClient,
  publicKey: string,
  opts: MidenAccountOpts
) {
  const { AccountBuilder, AccountComponent, WebClient } =
    await import("@demox-labs/miden-sdk");
  let pkc = await evmPkToCommitment(publicKey);
  if (midenClient instanceof WebClient) {
    // create a new account
    const accountBuilder = new AccountBuilder(new Uint8Array(32).fill(1));

    const account = accountBuilder
      .withAuthComponent(
        AccountComponent.createAuthComponentFromCommitment(pkc, 1)
      )
      .accountType(opts.type)
      .storageMode(opts.storageMode)
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
  } else {
    throw new Error("Invalid Miden Client");
  }
}

export async function createParaMidenClient(
  para: ParaWeb,
  wallet: Wallet,
  opts: Opts
) {
  let publicKey = await getUncompressedPublicKeyFromWallet(para, wallet);
  const { WebClient } = await import("@demox-labs/miden-sdk");

  const client = await WebClient.createClientWithExternalKeystore(
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
