import { evmAddressSchema, evmChainIdSchema } from '@schema/common';
import z from 'zod';

/**
 * API schema for the `/lbp-buy-preview` request. Same as `buyEvmSdkSchema`
 * (sdk.ts) plus `account`, which `buyEvm` derives from `PRIVATE_KEY` before building this
 * payload - callers never supply `account` directly.
 */
export const buyEvmApiRequestSchema = z.object({
  chainId: evmChainIdSchema,
  address: evmAddressSchema,
  account: evmAddressSchema.describe(
    'Buyer wallet address, derived from PRIVATE_KEY',
  ),
  slippage: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  referrer: evmAddressSchema,
  amount: z.number().min(0),
});

export type BuyEvmApiRequest = z.infer<typeof buyEvmApiRequestSchema>;
