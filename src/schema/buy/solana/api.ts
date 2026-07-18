import { SOLANA_ZERO_ADDRESS } from '@constants';
import {
  slippageSchema,
  solanaAddressSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * API-WIRE schema for the based.bid Solana buy endpoint payload. Same as
 * `buySolanaSdkSchema` (./sdk.ts) but renames `address` to `memeMint`, adds `signer`
 * (derived from `SOLANA_PRIVATE_KEY`) and `tokenBalance` (fetched from-chain), which
 * callers never supply directly.
 */
export const buySolanaApiSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: solanaAddressSchema.describe(
    'Buyer wallet address, derived from SOLANA_PRIVATE_KEY',
  ),
  memeMint: solanaAddressSchema.describe('Token mint address to buy'),
  amount: z.number().min(0),
  slippage: slippageSchema,
  referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS),
  tokenBalance: z
    .string()
    .optional()
    .default('0')
    .describe(
      'Buyer current token balance, fetched on-chain before the request',
    ),
  isSandboxMode: z.boolean().default(false),
});

export type BuySolanaApi = z.infer<typeof buySolanaApiSchema>;
