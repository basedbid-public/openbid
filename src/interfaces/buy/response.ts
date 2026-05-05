import { BuyRequest } from '@interfaces/buy/request';

export interface BuyResponse {
  ok: boolean;
  functionName: string;
  address: `0x${string}`;
  args: unknown[];
  value: string;
  chain: {
    id: number;
    name: string;
  };
  data: BuyRequest;
}
