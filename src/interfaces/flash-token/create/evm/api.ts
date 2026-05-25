import { EvmDexType } from 'enums/evm';
import { EVM_V4_FEES } from 'interfaces/v4-fees';

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
    v4?: EVM_V4_FEES;
  };
}
