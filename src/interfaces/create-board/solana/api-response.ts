import { SolanaApiResponse } from '@interfaces';

export interface CreateSolanaBoardApiResponse extends SolanaApiResponse {
  boardId: string;
  boardTitle: string;
  metadataUrl?: string;
  txCost?: {
    currency: string;
    totalRequired: {
      lamports: string;
      sol: string;
    };
  };
}
