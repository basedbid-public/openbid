export interface CreateMemeArgs {
  package: bigint;
  initCode: string;
  salt: string;
  subBoardTitle: string;
  referrer: string;
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
