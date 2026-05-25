import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import z from 'zod';

export const buyEvmApiRequestSchema = z.object({
  chainId: evmChainIdSchema,
  address: evmAddressSchema,
  account: evmAddressSchema,
  slippage: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  referrer: evmAddressSchema,
  amount: z.number().min(0),
});

export type BuyEvmApiRequest = z.infer<typeof buyEvmApiRequestSchema>;
