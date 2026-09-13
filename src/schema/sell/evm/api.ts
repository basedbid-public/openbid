import { evmAddressSchema, evmChainIdSchema } from '@schema/common';
import { z } from 'zod';

export const sellEvmApiSchema = z.object({
  chainId: evmChainIdSchema,
  address: evmAddressSchema.describe('Token contract address being sold'),
  account: evmAddressSchema.describe('Seller wallet address'),
  slippage: z
    .union([z.literal(1), z.literal(5), z.literal(10)])
    .describe('Max acceptable slippage percent: 1, 5, or 10'),
  referrer: evmAddressSchema.describe(
    'Wallet to credit referral fees to; use the zero address for no referrer',
  ),
  amount: z.number().min(0).describe('Amount to sell, in token units'),
});

export type SellEvmApi = z.infer<typeof sellEvmApiSchema>;
