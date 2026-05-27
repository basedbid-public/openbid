import { SolanaChainId } from 'types/chain-id';

export const SOLANA_CHAIN_SLUG_CONFIG: Record<SolanaChainId, string> = {
  501: 'sol',
  5011: 'tsol',
} as const;

export const SOLANA_CHAIN_NAME_CONFIG: Record<SolanaChainId, string> = {
  501: 'solana',
  5011: 'solana-devnet',
} as const;
