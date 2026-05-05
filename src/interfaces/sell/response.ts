import { SellRequest } from './request';

export interface SellTransaction {
  functionName: string;
  address: string;
  args: string[];
  value: string;
}

export interface SellResponse {
  trx1: SellTransaction;
  trx2: SellTransaction;
  chain: {
    id: number;
    symbol: string;
  };
  data: SellRequest;
}
