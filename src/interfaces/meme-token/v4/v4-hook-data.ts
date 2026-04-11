import { Address } from 'viem';
import { DynamicFeeConfig } from './dynamic-fee-config';
import { V4FeeDistributionConfig } from './fee-distribution-config';
import { PoolKey } from './pool-key';
import { TieredFeeConfig } from './tiered-fee-config';
import { VolumeConfig } from './volume-config';

export interface V4HookData {
  hasV4Hook: boolean;
  hookFeeDistributionConfig: V4FeeDistributionConfig;
  feeThreshold: bigint;
  rewardToken: Address;
  rewardPoolKey: PoolKey;
  feeKind: number;
  staticPoolFeeBpsBuy: number;
  staticPoolFeeBpsSell: number;
  hookFeeBpsBuy: number;
  hookFeeBpsSell: number;
  dynamicFeeConfig: DynamicFeeConfig;
  tieredFeeConfig: TieredFeeConfig;
  protectPeriod: number;
  maxBuyPerOrigin: bigint;
  isAntiSandwich: boolean;
  cooldownSeconds: number;
  penaltyFeeBps: number;
  volumeConfig: VolumeConfig;
}
