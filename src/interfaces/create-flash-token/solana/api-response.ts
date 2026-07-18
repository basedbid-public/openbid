import { SolanaApiResponse } from '@interfaces';

export interface CreateSolanaFlashTxApiResponse extends SolanaApiResponse {
  mintAddress: string;
  flashSeed: string;
  mintSignerSecretHex: string;
  positionNftSignerSecretHex?: string;
  metadataUrl?: string;
  txCost?: {
    currency: string;
    totalRequired: {
      lamports: string;
      sol: string;
    };
  };
}

export interface CreateSolanaFlashTx1ApiResponse extends CreateSolanaFlashTxApiResponse {
  meteoraTokenAccountSeed?: string;
  positionNftMintAddress?: string;
}
