import { SolanaApiResponse } from 'interfaces/common';

export interface CreateSolanaLbpApiResponse extends SolanaApiResponse {
  mintAddress: string;
  mintSignerSecretHex: string;
  metadataUrl?: string;
  txCost?: {
    currency: string;
    totalRequired: {
      lamports: string;
      sol: string;
    };
  };
}
