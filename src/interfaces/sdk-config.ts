import type { Address, Hex } from 'viem';

export interface OpenClawSDKConfig {
  chainId: number;
  rpcUrl: string;
  privateKey: Hex;
  contractAddress: Address;
}
