import { SolanaApiResponse } from '@interfaces';

export interface CreateSolanaBoardApiResponse extends SolanaApiResponse {
  txCost?: {
    currency: string;
    totalRequired: {
      lamports: string;
      sol: string;
    };
  };
}
