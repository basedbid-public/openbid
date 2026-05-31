import { SolanaChainId } from 'types/chain-id';

export interface SolanaVanityUpdateData {
  chainId: SolanaChainId;
  mintAddress: string;
  signature: string;
}
