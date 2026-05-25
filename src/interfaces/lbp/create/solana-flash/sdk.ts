import { SolanaDexType } from 'enums/solana/dex.type';

export interface CreateLbpFlashSdk {
  token: {
    name: string;
    symbol: string;
    totalSupply: string;
    decimals: 9;
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
    version: SolanaDexType;
    feeTier: number;
    finalStartPrice: number;
    hasInitialSwap: boolean;
    solanaInitialBuyHuman: string;
    virtualUsd: number;
    nativeSolPriceUsd: number;
    hasHookDynamicFee: boolean;
    boardSeed?: string;
  };
}
