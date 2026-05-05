import { ChainId } from 'types/chain-id';

export interface SellRequest {
  chainId: ChainId;
  address: string;
  account: string;
  slippage: number;
  referrer: string;
  amount: number;
}
