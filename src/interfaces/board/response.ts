import { CreateBoardRequest } from '..';

export interface CreateBoardApiResponse {
  ok: boolean;
  functionName: string;
  address: `0x${string}`;
  args: unknown[];
  value: string;
  chain: {
    id: number;
    name: string;
  };
  data: CreateBoardRequest;
}
