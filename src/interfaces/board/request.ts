import { ChainId } from 'types/chain-id';

export interface BoardFee {
  listingFee: bigint;
  listingReferralFee: bigint;
  buyFeePer: number;
  sellFeePer: number;
  finalizeFeePer: number;
  flashLaunchFeePer: number;
  tradingFeeAfterLaunchPer: number;
  padding: number;
}

export interface CreateBoardRequest {
  chainId: ChainId;
  title: string;
  description: string;
  logo: string; // File path to the logo image
  banner?: string; // File path to the banner image (optional)
  fees?: BoardFee[]; // Optional - defaults will be used if not provided
}

export interface CreateBoardMetadata {
  title: string;
  description: string;
  logo: string; // IPFS URL after upload
  banner?: string; // IPFS URL after upload
}

export interface CreateBoardResponse {
  ok: boolean;
  boardId: string;
  boardTitle: string;
  metadataUrl: string;
  logoUrl: string;
  transactionHash: `0x${string}`;
}
