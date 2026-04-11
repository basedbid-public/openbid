import {
  DexConfig,
  DynamicFeeConfig,
  MemeTokenData,
  PoolKey,
  TieredFeeConfig,
  V4FeeDistributionConfig,
  V4HookData,
  VolumeConfig,
} from 'interfaces';
import type { Address, Hex } from 'viem';

export class InitialDataBuilder {
  private config: Partial<MemeTokenData> = {
    maxAllocationPerUser: BigInt(0),
    maxAllocationPerWhitelistedUser: BigInt(0),
    whitelistMerkleRoot:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    buyReferralFeePer: 0,
    sellMemeTokenOwnerFeePer: 0,
    buyMemeTokenOwnerFeePer: 0,
    finalizeFeePer: 0,
    delayTradeTime: 0,
    isWhitelist: false,
    _padding: 0,
  };

  static create(): InitialDataBuilder {
    return new InitialDataBuilder();
  }

  withBaseToken(baseToken: Address): this {
    this.config.baseTokenForPair = baseToken;
    return this;
  }

  withLiquidity(hardcap: bigint | string, softcap: bigint | string): this {
    this.config.liquidityForHardcap = hardcap;
    this.config.liquidityForSoftcap = softcap;
    return this;
  }

  withMarketCap(marketCap: bigint | string): this {
    this.config.marketCap = marketCap;
    return this;
  }

  withTiming(startTime: number, endTime: number): this {
    this.config.startTime = startTime;
    this.config.endTime = endTime;
    return this;
  }

  withAllocations(
    maxPerUser: bigint,
    maxPerWhitelistedUser: bigint,
    whitelistMerkleRoot?: Hex,
    isWhitelist?: boolean,
  ): this {
    this.config.maxAllocationPerUser = maxPerUser;
    this.config.maxAllocationPerWhitelistedUser = maxPerWhitelistedUser;
    if (whitelistMerkleRoot)
      this.config.whitelistMerkleRoot = whitelistMerkleRoot;
    if (isWhitelist !== undefined) this.config.isWhitelist = isWhitelist;
    return this;
  }

  withFees(
    buyReferral: number,
    sellOwner: number,
    buyOwner: number,
    finalize: number,
  ): this {
    this.config.buyReferralFeePer = buyReferral;
    this.config.sellMemeTokenOwnerFeePer = sellOwner;
    this.config.buyMemeTokenOwnerFeePer = buyOwner;
    this.config.finalizeFeePer = finalize;
    return this;
  }

  withDex(dexConfigs: DexConfig[]): this {
    this.config.dex = dexConfigs;
    return this;
  }

  withMetadata(metadataId: string): this {
    this.config.metaData = metadataId;
    return this;
  }

  build() {
    if (!this.config.baseTokenForPair)
      throw new Error('baseTokenForPair is required');
    if (!this.config.liquidityForHardcap)
      throw new Error('liquidityForHardcap is required');
    if (!this.config.liquidityForSoftcap)
      throw new Error('liquidityForSoftcap is required');
    if (!this.config.marketCap) throw new Error('marketCap is required');
    if (this.config.startTime === undefined)
      throw new Error('startTime is required');
    if (this.config.endTime === undefined)
      throw new Error('endTime is required');
    if (!this.config.dex || this.config.dex.length === 0)
      throw new Error('At least one DEX is required');
    if (!this.config.metaData) throw new Error('metaData is required');

    return this.config;
  }
}

export class V4HookDataBuilder {
  private config: Partial<V4HookData> = {
    hasV4Hook: false,
    feeThreshold: BigInt(0),
    rewardToken: '0x0000000000000000000000000000000000000000',
    feeKind: 0,
    staticPoolFeeBpsBuy: 3000,
    staticPoolFeeBpsSell: 3000,
    hookFeeBpsBuy: 100,
    hookFeeBpsSell: 100,
    protectPeriod: 0,
    maxBuyPerOrigin: BigInt(0),
    isAntiSandwich: false,
    cooldownSeconds: 0,
    penaltyFeeBps: 0,
    hookFeeDistributionConfig: {
      liquidityFeeBps: 100,
      buybackFeeBps: 100,
      rewardFeeBps: 100,
      customWallets: [],
      customWalletBps: [],
    },
    rewardPoolKey: {
      currency0: '0x0000000000000000000000000000000000000000',
      currency1: '0x0000000000000000000000000000000000000000',
      fee: 3000,
      tickSpacing: 60,
      hooks: '0x0000000000000000000000000000000000000000',
    },
    dynamicFeeConfig: {
      minBaseFeeBpsBuy: 100,
      minBaseFeeBpsSell: 100,
      maxBaseFeeBpsBuy: 10000,
      maxBaseFeeBpsSell: 10000,
      baseFeeFactorBuy: 1000000,
      baseFeeFactorSell: 1000000,
      defaultBaseFeeBpsBuy: 3000,
      defaultBaseFeeBpsSell: 3000,
      surgeDecayPeriodSeconds: 3600,
      surgeMultiplierPpm: 2000000,
      perSwapMode: false,
      capAutoTuneStepPpm: 100000,
      capAutoTuneIntervalSeconds: 86400,
    },
    tieredFeeConfig: {
      buyFeesBps: [],
      sellFeesBps: [],
      buyFeeTierAmountLevels: [],
      sellFeeTierAmountLevels: [],
    },
    volumeConfig: {
      volumeIntervalSeconds: 3600,
      volumeLevels: [],
      volumeMultiplierBps: [],
    },
  };

  static create(): V4HookDataBuilder {
    return new V4HookDataBuilder();
  }

  withV4Hook(enabled: boolean): this {
    this.config.hasV4Hook = enabled;
    return this;
  }

  withFeeDistribution(config: Partial<V4FeeDistributionConfig>): this {
    this.config.hookFeeDistributionConfig = {
      ...this.config.hookFeeDistributionConfig!,
      ...config,
    };
    return this;
  }

  withRewardToken(token: Address): this {
    this.config.rewardToken = token;
    return this;
  }

  withRewardPoolKey(poolKey: PoolKey): this {
    this.config.rewardPoolKey = poolKey;
    return this;
  }

  withFeeKind(kind: number): this {
    this.config.feeKind = kind;
    return this;
  }

  withStaticFees(buyBps: number, sellBps: number): this {
    this.config.staticPoolFeeBpsBuy = buyBps;
    this.config.staticPoolFeeBpsSell = sellBps;
    return this;
  }

  withHookFees(buyBps: number, sellBps: number): this {
    this.config.hookFeeBpsBuy = buyBps;
    this.config.hookFeeBpsSell = sellBps;
    return this;
  }

  withDynamicFeeConfig(config: Partial<DynamicFeeConfig>): this {
    this.config.dynamicFeeConfig = {
      ...this.config.dynamicFeeConfig!,
      ...config,
    };
    return this;
  }

  withTieredFeeConfig(config: Partial<TieredFeeConfig>): this {
    this.config.tieredFeeConfig = {
      ...this.config.tieredFeeConfig!,
      ...config,
    };
    return this;
  }

  withProtection(protectPeriod: number, maxBuyPerOrigin: bigint): this {
    this.config.protectPeriod = protectPeriod;
    this.config.maxBuyPerOrigin = maxBuyPerOrigin;
    return this;
  }

  withAntiSandwich(
    enabled: boolean,
    cooldownSeconds?: number,
    penaltyFeeBps?: number,
  ): this {
    this.config.isAntiSandwich = enabled;
    if (cooldownSeconds !== undefined)
      this.config.cooldownSeconds = cooldownSeconds;
    if (penaltyFeeBps !== undefined) this.config.penaltyFeeBps = penaltyFeeBps;
    return this;
  }

  withVolumeConfig(config: Partial<VolumeConfig>): this {
    this.config.volumeConfig = {
      ...this.config.volumeConfig!,
      ...config,
    };
    return this;
  }

  build() {
    return this.config;
  }
}

export class DexConfigBuilder {
  private configs: DexConfig[] = [];

  static create(): DexConfigBuilder {
    return new DexConfigBuilder();
  }

  addDex(
    router: Address,
    fee: number,
    tickSpacing: number,
    per: number,
    options?: {
      poolId?: bigint;
      isLPBurn?: boolean;
    },
  ): this {
    this.configs.push({
      routerOrPositionManager: router,
      poolId: options?.poolId ?? BigInt(0),
      fee,
      tickSpacing,
      per,
      isLPBurn: options?.isLPBurn ?? false,
      _padding: 0,
    });
    return this;
  }

  build(): DexConfig[] {
    return this.configs;
  }
}

export const BaseDexConfigs = {
  uniswapV3: (
    router: Address = '0x03a520b32c04bf3beef7beb72e919cf822ed34f1',
  ): DexConfig => ({
    routerOrPositionManager: router,
    poolId: BigInt(0),
    fee: 500,
    tickSpacing: 10,
    per: 1000000,
    isLPBurn: false,
    _padding: 0,
  }),
};

export const DefaultDynamicFeeConfig: DynamicFeeConfig = {
  minBaseFeeBpsBuy: 100,
  minBaseFeeBpsSell: 100,
  maxBaseFeeBpsBuy: 10000,
  maxBaseFeeBpsSell: 10000,
  baseFeeFactorBuy: 1000000,
  baseFeeFactorSell: 1000000,
  defaultBaseFeeBpsBuy: 3000,
  defaultBaseFeeBpsSell: 3000,
  surgeDecayPeriodSeconds: 3600,
  surgeMultiplierPpm: 2000000,
  perSwapMode: false,
  capAutoTuneStepPpm: 100000,
  capAutoTuneIntervalSeconds: 86400,
};

export const DefaultFeeDistributionConfig: V4FeeDistributionConfig = {
  liquidityFeeBps: 100,
  buybackFeeBps: 100,
  rewardFeeBps: 100,
  customWallets: [],
  customWalletBps: [],
};
