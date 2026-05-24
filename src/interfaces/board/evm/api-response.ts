import { ChainId } from 'types/chain-id';

export interface CreateBoardApiResponse {
  ok: boolean;
  functionName: string;
  address: `0x${string}`;
  args: unknown[];
  value: string;
  chain: {
    id: number;
    name: string;
  };
  data: {
    chainId: ChainId;
    title: string;
    description: string;
    logo: string; // File path to the logo image
    banner?: string; // File path to the banner image (optional)
    fees?: {
      listingFee: bigint;
      listingReferralFee: bigint;
      buyFeePer: number;
      sellFeePer: number;
      finalizeFeePer: number;
      flashLaunchFeePer: number;
      tradingFeeAfterLaunchPer: number;
      padding: number;
    }[]; // Optional - defaults will be used if not provided
  };
}
