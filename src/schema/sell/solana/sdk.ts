import { slippageSchema, solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `sellSolana`. Caller-facing args; `signer` is derived internally
 * from `SOLANA_PRIVATE_KEY` rather than part of this schema (see `./api.ts`).
 *
 * The `.refine` below rejects the one invalid combination: sandbox mode paired with
 * the mainnet chain ID (501). Sandbox requests must target devnet (5011) instead; every
 * other combination (sandbox+devnet, non-sandbox+mainnet, non-sandbox+devnet) is valid.
 */
export const sellSolanaSdkSchema = z
  .object({
    isSandboxMode: z
      .boolean()
      .default(false)
      .describe(
        'Route through testnet.based.bid (true) instead of mainnet (false)',
      ),
    chainId: solanaChainIdSchema,
    address: solanaAddressSchema.describe('Token mint address to sell'),
    amount: z.number().min(0).describe('Amount to sell, in token units'),
    slippage: slippageSchema,
  })
  .refine((data) => !(data.isSandboxMode && data.chainId === 501), {
    message:
      'Cannot invoke Solana Mainnet in sandbox mode - use chain ID 5011 instead',
    path: ['chainId'],
  });

export type SellSolanaSdk = z.infer<typeof sellSolanaSdkSchema>;
