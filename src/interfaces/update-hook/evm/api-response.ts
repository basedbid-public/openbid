export type UpdateHookTxTarget = 'hook' | 'dividendToken';

export interface UpdateHookTransaction {
  target: UpdateHookTxTarget;
  address: `0x${string}`;
  abi: unknown[];
  functionName: string;
  args: unknown[];
}

export interface UpdateHookApiResponse {
  ok: boolean;
  tokenKind?: 'flash' | 'meme';
  chainId?: number;
  hookAddress?: `0x${string}`;
  hookAbi?: unknown[];
  address: `0x${string}`;
  abi: unknown[];
  functionName: string;
  args: unknown[];
  transactions: UpdateHookTransaction[];
  error?: string;
}
