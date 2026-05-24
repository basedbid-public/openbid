import { SolanaDexType } from '@enums/solana/dex.type';

export interface CreateLbpFlashSdk {
  flashDex: SolanaDexType;
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
  // Raydium specific
  raydium?: {
    feeTierIndex: string;
    finalStartPrice: number;
    hasInitialSwap: boolean;
    solanaInitialBuyHuman: string;
  };
  // Meteora specific
  meteora?: {
    virtualUsd: number;
    nativeSolPriceUsd: number;
    feeTierIndex: string;
    hasHookDynamicFee: boolean;
    boardSeed?: string;
  };
}
