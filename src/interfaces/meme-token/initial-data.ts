import { Hex } from 'viem';
import { DexConfig } from '../dex-config';

export interface MemeTokenData {
  baseTokenForPair: `0x${string}`;
  liquidityForHardcap: bigint | string;
  liquidityForSoftcap: bigint | string;
  marketCap: bigint | string;
  maxAllocationPerUser: bigint;
  maxAllocationPerWhitelistedUser: bigint;
  whitelistMerkleRoot: Hex;
  buyReferralFeePer: number;
  sellMemeTokenOwnerFeePer: number;
  buyMemeTokenOwnerFeePer: number;
  finalizeFeePer: number;
  delayTradeTime: number;
  startTime: number;
  endTime: number;
  isWhitelist: boolean;
  _padding?: number;
  dex: DexConfig[];
  metaData: string;
}
