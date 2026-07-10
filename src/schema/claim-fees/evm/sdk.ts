import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import z from 'zod';

/**
 * SDK-INPUT schema for `claimEvmFees`. The wallet claiming fees (`account`) is derived
 * from `PRIVATE_KEY` internally, not part of this schema - see `./api.ts` for the
 * backend payload that includes it.
 */
export const claimEvmFeesSdkSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe('Launch on based.bid testnet (true) instead of mainnet (false)'),
  address: evmAddressSchema.describe(
    'Pool or board contract address to claim fees from',
  ),
  target: z
    .enum(['pool', 'board'])
    .describe('"pool" claims trading fees, "board" claims board listing fees'),
  chainId: evmChainIdSchema,
});

export type ClaimEvmFeesSdk = z.infer<typeof claimEvmFeesSdkSchema>;
