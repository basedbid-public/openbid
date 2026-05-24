import {
  CooldownDurationType,
  PenaltyFeeType,
  RewardTokenType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from '@enums/fee-builder';
import { Address } from 'viem';

export type V4BuyLimits =
  | {
      protectPeriod: number;
      maxBuyPerOrigin: number;
      isHookWhitelist: false;
    }
  | {
      protectPeriod: number;
      maxBuyPerOrigin: number;
      isHookWhitelist: true;
      maxBuyForWhitelisted: number;
    };

export interface EVM_V4_FEES {
  liquidity: number;
  buyback: number;
  reward: {
    token: RewardTokenType;
    amount: number;
    minTokenBalanceForDividends: number;
  };
  customWallets: Array<{
    name: string;
    address: Address;
    amount: number;
  }>;
  feeThreshold: 0.01 | 0.1 | 0.25 | 0.5 | 1;
  tieredFeesEnabled: boolean;
  dynamicFees: {
    hasHookDynamicFee: boolean;
    volatilityDecayPeriod: VolatilityDecayPeriodType;
    volatilityMultiplier: VolatilityMultiplierType;
    volatilityTrigger: VolatilityTriggerType;
  };
  cooldownProtection: {
    cooldownDuration: CooldownDurationType;
    penaltyFee: PenaltyFeeType;
  };
  buyLimits: V4BuyLimits;
  mevProtectionEnabled: boolean;
}

export interface SOLANA_V4_FEES {
  liquidity: number;
  buyback: number;
  reward: {
    token: RewardTokenType;
    amount: number;
    minTokenBalanceForDividends: number;
  };
  customWallets: Array<{
    name: string;
    address: Address;
    amount: number;
  }>;
  feeThreshold: 0.01 | 0.1 | 0.25 | 0.5 | 1;
  dynamicFees: boolean;
}
