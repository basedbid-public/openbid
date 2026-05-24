export interface FeeDistributionResponse {
  ok: boolean;
  chainId: number;
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
}
