import { EvmChainId } from 'types/chain-id';
import { base, bsc, Chain, mainnet } from 'viem/chains';

export const CHAIN_CONFIG: Record<EvmChainId, Chain> = {
  8453: base,
  1: mainnet,
  56: bsc,
} as const;

export const CHAIN_NAME_CONFIG: Record<EvmChainId, string> = {
  8453: 'base',
  1: 'ethereum',
  56: 'bsc',
} as const;

export const CHAIN_SLUG_CONFIG: Record<EvmChainId, string> = {
  8453: 'base',
  1: 'eth',
  56: 'bsc',
} as const;
