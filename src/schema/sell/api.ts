import { z } from 'zod';

export const sellApiSchema = z.object({
  chainId: z.union([
    z.literal(1),
    z.literal(56),
    z.literal(137),
    z.literal(8453),
  ]),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
  slippage: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  referrer: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
  amount: z.number().min(0),
});
