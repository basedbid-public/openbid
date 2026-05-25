export interface BuySolanaResponse {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  transaction: string;
  lookupTableAddresses?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
}
