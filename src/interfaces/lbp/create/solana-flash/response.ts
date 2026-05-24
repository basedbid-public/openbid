export interface CreateLbpFlashTx1Response {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  flashDex?: number;
  transaction: string;
  mintAddress: string;
  mintSignerSecretHex: string;
  flashSeed: string;
  meteoraTokenAccountSeed?: string;
  positionNftMintAddress?: string;
  positionNftSignerSecretHex?: string;
  lookupTableAddresses?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  note?: string;
  signingNote?: string;
  metadataUrl?: string;
  vanityLifecycle?: string;
}

export interface CreateLbpFlashTx2Response {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  flashDex?: number;
  transaction: string;
  positionNftMintAddress?: string;
  positionNftSignerSecretHex?: string;
  tokenAccountSeedForRaydium?: string;
  lookupTableAddresses?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
}
