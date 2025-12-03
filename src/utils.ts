import ParaWeb, { Wallet } from "@getpara/web-sdk";

/// Create a valid serialized miden `Signature` from the hex signature given by para
export const fromHexSig = (hexString: string) => {
  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid string len");
  }
  // 1 -> Auth scheme for ECDSA
  const bytes: number[] = [1];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(`${hexString[i]}${hexString[i + 1]}`, 16));
  }
  //TODO: bug in miden crypto where there is an extra byte in the serialized signature
  bytes.push(0);
  return Uint8Array.from(bytes);
};

export const hexToBytes = (hexString: string) => {
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(`${hexString[2 * i]}${hexString[2 * i + 1]}`, 16);
  }

  return bytes;
};

const TAG_EVEN = 2;
const TAG_ODD = 3;

function bigintFromLeBytes(bytes: Uint8Array | number[]): bigint {
  let result = BigInt(0);

  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) + BigInt(bytes[i]);
  }

  return result;
}

// assumes the format '0x04' | X | Y
export const evmPkToCommitment = async (uncompressedPublicKey: string) => {
  const { Felt, Rpo256, FeltArray } = await import("@demox-labs/miden-sdk");
  const withoutPrefix = uncompressedPublicKey.slice(4);
  const x = withoutPrefix.slice(0, 64);
  const y = withoutPrefix.slice(64); // hex encoded string

  // check if y is odd or even for tag
  let tag: number;
  if (parseInt(y[63], 16) % 2 === 0) {
    tag = TAG_EVEN;
  } else {
    tag = TAG_ODD;
  }
  // create the serialized bytes array
  const bytes = [tag];
  for (let i = 0; i < 64; i += 2) {
    bytes.push(parseInt(`${x[i]}${x[i + 1]}`, 16));
  }

  // convert bytes to a felt array
  // 4 bytes per felt therefore a 9 felt array
  // each fe
  const felts = [];
  // process first 8
  for (let i = 0; i < 8; i++) {
    felts.push(new Felt(bigintFromLeBytes(bytes.slice(i * 4, i * 4 + 4))));
  }
  // push the last 33rd byte
  felts.push(new Felt(bigintFromLeBytes(bytes.slice(32))));

  return Rpo256.hashElements(new FeltArray(felts));
};

export const getUncompressedPublicKeyFromWallet = async (
  para: ParaWeb,
  wallet: Wallet
) => {
  let publicKey = wallet.publicKey;
  if (!publicKey) {
    const { token } = await para.issueJwt();
    const payload = JSON.parse(window.atob(token.split(".")[1]));
    if (!payload.data) {
      throw new Error("Got invalid jwt token");
    }
    const wallets = payload.data.connectedWallets;
    const w = wallets.find((w) => w.id === wallet.id);
    if (!w) {
      throw new Error("Wallet Not Found in jwt data");
    }
    publicKey = w.publicKey;
  }
  return publicKey;
};
