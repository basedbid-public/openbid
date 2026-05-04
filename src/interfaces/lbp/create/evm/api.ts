import { LbpFees } from '@interfaces/lbp/fees';
import { EvmDexType } from 'enums/evm';
import { Address } from 'viem';

export interface CreateLbpEvmApi {
  /** 1 = 'based', 2 = 'super_based', 3 = 'ultra_based' */
  package: 0 | 1 | 2;
  chainId: number;
  token: {
    name: string;
    symbol: string;
    totalSupply: number;
    initialBuyAmount: number;
    metadataUrl: string;
  };
  sale: {
    boardTitle: string;
    marketCap: number;
    startTime: number;
    maxAllocationPerUser: number;
    maxAllocationPerWhitelistedUser: number;
    delayTradeTime: number;
    whitelistedAddresses: Array<Address>;
    softCap: {
      amount: number;
      endTime: number;
    };
  };
  dex: {
    version: EvmDexType;
    feeTier: number;
  };
  fees: LbpFees;
}
