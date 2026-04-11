import type { Address } from 'viem';

export interface DexConfig {
  routerOrPositionManager: Address;
  poolId: bigint;
  fee: number;
  tickSpacing: number;
  per: number;
  isLPBurn: boolean;
  _padding?: number;
}
