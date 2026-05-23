export interface CreateBoardSolanaSdk {
  title: string;
  description: string;
  logo: string; // File path to the logo image
  banner: string; // File path to the banner image
  fees?: BoardFeeSolana[]; // Optional - defaults will be used if not provided
  flashLaunchFeePer: string;
}

export interface BoardFeeSolana {
  listingFee: string;
  listingReferralFee: string;
  buyFeePer: string;
  sellFeePer: string;
  finalizeFeePer: string;
  flashLaunchFeePer: string;
  tradingFeeAfterLaunchPer: string;
}
