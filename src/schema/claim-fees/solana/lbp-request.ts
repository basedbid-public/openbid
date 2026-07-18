import { solanaAddressSchema } from '@schema/common';
import { solanaChainIdSchema } from '@schema/common/sdk-input';
import z from 'zod';

/**
 * Request schema for claiming LBP fees on Solana. Like the Flash Token equivalent
 * (./flash-request.ts), there's no sdk/api split here - the claimant wallet is derived
 * from `SOLANA_PRIVATE_KEY` and added internally, not part of this schema.
 */
export const claimSolanaLbpFeesRequestSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe(
      'Route through testnet.based.bid (true) instead of mainnet (false)',
    ),
  chainId: solanaChainIdSchema,
  memeMint: solanaAddressSchema.describe(
    'LBP token mint address to claim accumulated fees from',
  ),
});

export type ClaimSolanaLbpFeesRequest = z.infer<
  typeof claimSolanaLbpFeesRequestSchema
>;
