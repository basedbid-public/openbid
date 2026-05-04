import {
  CooldownDurationType,
  MaxBuyPerOriginType,
  PenaltyFeeType,
  ProtectPeriodType,
  RewardTokenType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from '@enums/fee-builder';
import { Address } from 'viem';

export interface V4Fees {
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
  snipeProtection: {
    maxBuyPerOrigin: MaxBuyPerOriginType;
    protectPeriod: ProtectPeriodType;
  };
  mevProtectionEnabled: boolean;
}
