export interface CreateSolanaFlashTxApiResponse {
  chainId: 5011;
  transaction?: string;
  mintAddress: string;
  flashSeed: string;
  mintSignerSecretHex: string;
  positionNftSignerSecretHex?: string;
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
  metadataUrl?: string;

  txCost?: {
    currency: string;
    totalRequired: {
      lamports: string;
      sol: string;
    };
  };
}

export interface CreateSolanaFlashTx1ApiResponse
  extends CreateSolanaFlashTxApiResponse {
  meteoraTokenAccountSeed?: string;
  positionNftMintAddress?: string;
}
