export enum MintAndConsumeStage {
  CreatingFaucet = 'CreatingFaucet',
  CreatedFaucet = 'CreatedFaucet',
  MintingTokens = 'MintingTokens',
  MintedTokens = 'MintedTokens',
  ConsumingTokens = 'ConsumingTokens',
  ConsumedTokens = 'ConsumedTokens',
}

export interface MintAndConsumeProgress {
  stage: MintAndConsumeStage;
  faucetId?: string;
  mintTxHash?: string;
  consumeTxHash?: string;
}
