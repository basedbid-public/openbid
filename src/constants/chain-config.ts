import { EvmChainId } from 'types/chain-id';
import { base, bsc, Chain, mainnet } from 'viem/chains';

export const CHAIN_CONFIG: Record<EvmChainId, Chain> = {
  8453: base,
  1: mainnet,
  56: bsc,
} as const;
