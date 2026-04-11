import { Address } from 'viem';

export interface V4FeeDistributionConfig {
  liquidityFeeBps: number;
  buybackFeeBps: number;
  rewardFeeBps: number;
  customWallets: Address[];
  customWalletBps: number[];
}
