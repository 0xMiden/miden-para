export async function send(
  midenParaClient: import('@demox-labs/miden-sdk').WebClient,
  fromAccountId: string,
  toAddress: string,
  faucetId: string,
  amount: bigint
) {
  const { Address, AccountId, NoteType } =
    await import('@demox-labs/miden-sdk');

  const toAddr = Address.fromBech32(toAddress);
  const fromAddr = AccountId.fromHex(fromAccountId);
  const from = await midenParaClient.getAccount(fromAddr);
  if (!from) {
    throw new Error('Sender account not found');
  }
  await midenParaClient.syncState();
  const newSendTransactionRequestStart = performance.now();
  const sendTxRequest = midenParaClient.newSendTransactionRequest(
    from.id(),
    toAddr.accountId(),
    AccountId.fromHex(faucetId),
    NoteType.Private,
    amount * BigInt(1e8)
  );
  const newSendTransactionRequestTime =
    performance.now() - newSendTransactionRequestStart;
  const outputNote = sendTxRequest.expectedOutputOwnNotes()[0];
  const executeStart = performance.now();
  const executedTx = await midenParaClient.executeTransaction(
    from.id(),
    sendTxRequest
  );
  const executeTransactionTime = performance.now() - executeStart;

  const proveStart = performance.now();
  const provenTx = await midenParaClient.proveTransaction(executedTx);
  const proveTransactionTime = performance.now() - proveStart;

  const submitStart = performance.now();
  const submissionHeight = await midenParaClient.submitProvenTransaction(
    provenTx,
    executedTx
  );
  const submitProvenTransactionTime = performance.now() - submitStart;

  await midenParaClient.applyTransaction(executedTx, submissionHeight);

  await midenParaClient.sendPrivateNote(
    outputNote,
    Address.fromBech32(toAddress)
  );
  return {
    txHash: executedTx.executedTransaction().id().toHex(),
    performance: {
      executeTransactionTime,
      proveTransactionTime,
      submitProvenTransactionTime,
      newSendTransactionRequestTime,
    },
  };
}
