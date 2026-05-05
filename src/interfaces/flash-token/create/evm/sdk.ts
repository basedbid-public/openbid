import { V4Fees } from '@interfaces/v4-fees';
import { EvmDexType } from 'enums/evm';
import { ChainId } from 'types/chain-id';

export interface CreateFlashTokenEvmSdk {
  chainId: ChainId;
  token: {
    name: string;
    symbol: string;
    totalSupply: number;
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
  sale: {
    boardTitle?: string; // if `undefined`, the flash token will launch under `based` board
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
