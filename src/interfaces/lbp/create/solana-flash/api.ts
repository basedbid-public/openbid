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
  value?: string;
}

export interface CreateSolanaFlashTx1ApiResponse
  extends CreateSolanaFlashTxApiResponse {
  meteoraTokenAccountSeed?: string;
  positionNftMintAddress?: string;
}
