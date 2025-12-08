import type React from 'react';
import { type MintAndConsumeProgress, MintAndConsumeStage } from './types';

export async function createFaucetMintAndConsume(
  client: import('@demox-labs/miden-sdk').WebClient,
  accountId: string,
  setProgress: React.Dispatch<
    React.SetStateAction<MintAndConsumeProgress | null>
  >
) {
  const { WebClient, AccountStorageMode, NoteType, AccountId } =
    await import('@demox-labs/miden-sdk');
  setProgress({ stage: MintAndConsumeStage.CreatingFaucet });
  const newClient = await WebClient.createClient(); // default endpoint is tesnet
  await newClient.syncState();
  const faucet = await newClient.newFaucet(
    AccountStorageMode.public(),
    false,
    'MID',
    8,
    BigInt(1_000_000_0000_00),
    0
  );
  setProgress((state) => ({
    ...state,
    stage: MintAndConsumeStage.CreatedFaucet,
    faucetId: faucet.id().toString(),
  }));
  await client.syncState();
  const to = await client.getAccount(AccountId.fromHex(accountId));
  if (!to) {
    throw new Error('Account not found');
  }
  setProgress((state) => ({
    ...state,
    stage: MintAndConsumeStage.MintingTokens,
  }));
  const mintTxRequest = newClient.newMintTransactionRequest(
    to.id(),
    faucet.id(),
    NoteType.Public,
    BigInt(1000) * BigInt(1e8)
  );
  const txHash = await newClient.submitNewTransaction(
    faucet.id(),
    mintTxRequest
  );
  console.log('Mint Tx Hash:', txHash.toString());
  setProgress((state) => ({
    ...state,
    stage: MintAndConsumeStage.MintedTokens,
    mintTxHash: txHash.toHex(),
  }));
  await new Promise((resolve) => setTimeout(resolve, 10000));
  console.log('Proceeding to consume tokens...');
  setProgress((state) => ({
    ...state,
    stage: MintAndConsumeStage.ConsumingTokens,
  }));
  await client.syncState();
  const mintedNotes = await client.getConsumableNotes(to.id());
  const mintedNoteIds = mintedNotes.map((n) =>
    n.inputNoteRecord().id().toString()
  );
  const consumeTxRequest = client.newConsumeTransactionRequest(mintedNoteIds);
  const consumeTxHash = await client.submitNewTransaction(
    to.id(),
    consumeTxRequest
  );
  await client.syncState();
  setProgress((state) => ({
    ...state,
    stage: MintAndConsumeStage.ConsumedTokens,
    consumeTxHash: consumeTxHash.toHex(),
  }));
}
