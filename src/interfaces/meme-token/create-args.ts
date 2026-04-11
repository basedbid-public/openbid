import { Address, Hex } from 'viem';

export interface CreateMemeArgs {
  /** Package type - 0 for 'based', 1 for 'super based', 2 for 'ultra based' */
  package: bigint;
  initCode: Hex;
  salt: Hex;
  subBoardTitle: string;
  referrer: Address;
  totalSupply: bigint;
  name: string;
  symbol: string;
  decimals: number;
  initialBuyAmount: bigint;
  isXSale: boolean;
  initialData: unknown[];
  v4HookData: unknown[];
  minTokenBalanceForDividends: bigint;
}
