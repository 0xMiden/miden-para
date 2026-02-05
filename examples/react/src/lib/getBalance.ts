export async function getBalance(accountId: string) {
  const { WebClient, AccountId } = await import('@miden-sdk/miden-sdk');

  const client = await WebClient.createClient(); // default endpoint is tesnet
  await client.syncState();

  const account = await client.getAccount(AccountId.fromHex(accountId));
  if (!account) {
    throw new Error('Account not found');
  }
  client.terminate();
  return account
    .vault()
    .fungibleAssets()
    .map((asset) => ({
      assetId: asset.faucetId().toString(),
      balance: (Number(asset.amount()) / 1e8).toString(),
    }));
}
