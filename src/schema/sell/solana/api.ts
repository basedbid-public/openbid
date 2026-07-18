import {
  slippageSchema,
  solanaAddressSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * API-WIRE schema for the based.bid Solana sell endpoint payload. Same as
 * `sellSolanaSdkSchema` (./sdk.ts) but renames `address` to `memeMint` and adds `signer`,
 * derived from `SOLANA_PRIVATE_KEY` rather than supplied by the caller.
 */
export const sellSolanaApiPayloadSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: solanaAddressSchema.describe(
    'Seller wallet address, derived from SOLANA_PRIVATE_KEY',
  ),
  memeMint: solanaAddressSchema.describe('Token mint address to sell'),
  amount: z.number().min(0),
  slippage: slippageSchema,
});

export type SellSolanaApi = z.infer<typeof sellSolanaApiPayloadSchema>;
