export interface ClaimSolanaFeeResponse {
  ok: true;
  chainId: 5011 | 501;
  chainSymbol: 'tsol' | 'sol';
  flashMint: string;
  collectKind: string;
  transaction: string;
  lookupTableAddresses: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote: string;
}
