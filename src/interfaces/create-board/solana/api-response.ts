import { SolanaApiResponse } from 'interfaces/common';

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
