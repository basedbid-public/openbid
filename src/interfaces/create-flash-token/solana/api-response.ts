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
  /**
   * Whether tx2 must be called after tx1 confirms. For Meteora, tx2 is only the
   * optional initial-buy swap - the server resolves the effective buy amount and
   * reports `false` when it is 0 (skip tx2, go straight to confirm-launch).
   * Absent on older servers: treat as required (legacy behavior).
   */
  tx2Required?: boolean;
  hasInitialSwap?: boolean;
  solanaInitialBuyHuman?: string;
}
