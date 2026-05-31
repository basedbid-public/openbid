export interface SolanaApiResponse {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
  lookupTableAddresses?: string[];
}
