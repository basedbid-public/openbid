import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import z from 'zod';

export const buyEvmSdkSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  chainId: evmChainIdSchema,
  address: evmAddressSchema,
  slippage: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  referrer: evmAddressSchema,
  amount: z.number().min(0),
});

export type BuyEvmSdk = z.infer<typeof buyEvmSdkSchema>;
