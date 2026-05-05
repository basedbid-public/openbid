import { EvmDexType } from '@enums/evm';
import { V4Fees } from '@interfaces/v4-fees';

export interface CreateFlashTokenEvmApi {
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
    maxTxAmountPercent: number;
    protectBlocks: number;
  };
  dex: {
    version: EvmDexType;
    feeTier: number;
  };
  fees: {
    v4?: V4Fees;
  };
}
