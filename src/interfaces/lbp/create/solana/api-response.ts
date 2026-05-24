export interface CreateLbpSolanaApiResponse {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  transaction: string;
  mintAddress: string;
  mintSignerSecretHex: string;
  lookupTableAddresses: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
  metadataUrl?: string;
  value?: string;
}
