export interface CreateBoardSolanaApi {
  chainId: 5011;
  signer: string;
  title: string;
  description: string;
  logoUrl: string;
  bannerUrl?: string;
  metaUri: string;
  fees: BoardFeeSolanaApi[];
}

export interface BoardFeeSolanaApi {
  listingFee: string;
  listingReferralFee: string;
  buyFeePer: number;
  sellFeePer: number;
  finalizeFeePer: number;
  flashLaunchFeePer: number;
  tradingFeeAfterLaunchPer: number;
  padding: number;
}
