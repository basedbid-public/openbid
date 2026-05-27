import { SolanaChainId } from 'types/chain-id';

export interface SolanaVanityUpdate {
  chainId: SolanaChainId;
  mintAddress: string;
  signature: string;
}
