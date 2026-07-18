import { SolanaChainId } from '@typedefs';

export interface SolanaVanityUpdateData {
  chainId: SolanaChainId;
  mintAddress: string;
  signature: string;
}
