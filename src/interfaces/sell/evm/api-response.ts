export interface SellTransaction {
  functionName: string;
  address: string;
  args: string[];
  value: string;
}

export interface EvmSellApiResponse {
  trx1: SellTransaction;
  trx2: SellTransaction;
}
