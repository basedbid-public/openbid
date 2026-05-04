export interface CreateLbpEvmResponse {
  ok: boolean;
  functionName: string;
  address: `0x${string}`;
  args: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    boolean,
    LbpCreateArgsConfig,
    LbpFeeBuilderConfig[],
    string,
  ];
  value: string;
  chain: {
    id: number;
    name: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: {
      default: {
        http: string[];
      };
    };
    blockExplorers: {
      default: {
        name: string;
        url: string;
        apiUrl: string;
        hash: string;
        address: string;
      };
    };
  };
  data: {
    package: 1 | 2 | 3;
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
      whitelistedAddresses: string[];
      softCap: {
        amount: number;
        endTime: number;
      };
    };
    dex: {
      version: string;
      feeTier: number;
    };
    fees: {
      buyPoolCreator: number;
      sellPoolCreator: number;
      buyReferral: number;
      graduation: number;
      v4: {
        liquidity: number;
        buyback: number;
        reward: {
          token: string;
          amount: number;
          minTokenBalanceForDividends: number;
        };
        customWallets: Array<{
          name: string;
          address: string;
          amount: number;
        }>;
        feeThreshold: number;
        tieredFeesEnabled: boolean;
        dynamicFees: {
          hasHookDynamicFee: boolean;
          volatilityDecayPeriod: string;
          volatilityMultiplier: string;
          volatilityTrigger: string;
        };
        cooldownProtection: {
          cooldownDuration: string;
          penaltyFee: string;
        };
        snipeProtection: {
          maxBuyPerOrigin: string;
          protectPeriod: string;
        };
        mevProtectionEnabled: boolean;
      };
    };
  };
  warnings: string[];
  vanityMintAddresses: {
    lbp: string;
    dividenedLbp: string;
  };
}

export type LbpCreateArgsConfig = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  boolean,
  string,
  LbpDividendConfig,
  string,
];

export type LbpDividendConfig = [
  string,
  string,
  string,
  string,
  string,
  boolean,
  string,
];

export interface LbpFeeBuilderConfig {
  hasV4Hook: boolean;
  hookFeeDistributionConfig: {
    liquidityFeeBps: string;
    buybackFeeBps: string;
    rewardFeeBps: string;
    customWallets: string[];
    customWalletBps: string[];
  };
  feeThreshold: string;
  rewardToken: string;
  rewardPoolKey: {
    currency0: string;
    currency1: string;
    fee: string;
    tickSpacing: string;
    hooks: string;
  };
  feeKind: number;
  staticPoolFeeBpsBuy: string;
  staticPoolFeeBpsSell: string;
  hookFeeBpsBuy: string;
  hookFeeBpsSell: string;
  dynamicFeeConfig: {
    minBaseFeeBpsBuy: string;
    minBaseFeeBpsSell: string;
    maxBaseFeeBpsBuy: string;
    maxBaseFeeBpsSell: string;
    baseFeeFactorBuy: string;
    baseFeeFactorSell: string;
    defaultBaseFeeBpsBuy: string;
    defaultBaseFeeBpsSell: string;
    surgeDecayPeriodSeconds: string;
    surgeMultiplierPpm: string;
    perSwapMode: boolean;
    capAutoTuneStepPpm: string;
    capAutoTuneIntervalSeconds: string;
  };
  tieredFeeConfig: {
    buyFeesBps: string[];
    sellFeesBps: string[];
    buyFeeTierAmountLevels: string[];
    sellFeeTierAmountLevels: string[];
  };
  protectPeriod: string;
  maxBuyPerOrigin: string;
  isAntiSandwich: boolean;
  cooldownSeconds: string;
  penaltyFeeBps: string;
  volumeConfig: {
    volumeIntervalSeconds: string;
    volumeLevels: string[];
    volumeMultiplierBps: string[];
  };
}
