import { solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import z from 'zod';

/**
 * Request schema for claiming Flash Token fees on Solana. There is no separate sdk/api
 * split for this operation - this single schema is both the caller-facing input and the
 * shape validated before the request is sent (the wallet claiming fees is derived from
 * `SOLANA_PRIVATE_KEY` and added internally, not part of this schema).
 */
export const claimSolanaFlashTokenFeesRequestSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe(
      'Route through testnet.based.bid (true) instead of mainnet (false)',
    ),
  chainId: solanaChainIdSchema,
  flashMint: solanaAddressSchema.describe(
    'Flash Token mint address to claim accumulated fees from',
  ),
});

export type ClaimSolanaFlashTokenFeesRequest = z.infer<
  typeof claimSolanaFlashTokenFeesRequestSchema
>;
