import { LbpFees } from '@interfaces/lbp/fees';
import { EvmDexType } from 'enums/evm/dex.type';
import { LaunchPackageType } from 'enums/launch-package.type';
import { ChainId } from 'types/chain-id';

export interface CreateLbpEvmSdk {
  package: LaunchPackageType;
  chainId: ChainId;
  token: {
    boardTitle?: string; // if `undefined`, the LBP will launch under `based` board
    name: string;
    symbol: string;
    totalSupply: number;
    marketCap: number;
    initialBuyAmount: number;
    metadata: {
      logo: string;
      twitter?: string;
      telegram?: string;
      website?: string;
      discord?: string;
      description?: string;
    };
  };
  dex: {
    version: EvmDexType;
    feeTier: number;
  };

  sale: {
    startTime: number;
    maxAllocationPerUser: number;
    maxAllocationPerWhitelistedUser: number;
    delayTradeTime?: number;
    whitelistedAddresses?: string[];
    softCap?: {
      amount: number;
      endTime: number;
    };
  };
  fees: LbpFees;
}
