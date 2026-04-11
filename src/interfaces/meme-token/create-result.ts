import type { Hex } from 'viem';

export interface CreateMemeResult {
  hash: Hex;
  receipt: {
    blockNumber: bigint;
    gasUsed: bigint;
    status: 'success' | 'reverted';
  };
  blockNumber: bigint;
  gasUsed: bigint;
  status: 'success' | 'reverted';
  explorerUrl: string;
}
