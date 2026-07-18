import { evmAddressSchema, evmChainIdSchema } from '@schema/common';
import z from 'zod';

/**
 * API-WIRE schema for the based.bid `/collect-fee` request. Same as `claimEvmFeesSdkSchema`
 * (./sdk.ts) plus `account`, which `claimEvmFees` derives from `PRIVATE_KEY` before
 * building this payload.
 */
export const claimEvmFeesApiSchema = z.object({
  address: evmAddressSchema,
  account: evmAddressSchema.describe(
    'Claimant wallet address, derived from PRIVATE_KEY',
  ),
  target: z.enum(['pool', 'board']),
  chainId: evmChainIdSchema,
});

export type ClaimEvmFeesApi = z.infer<typeof claimEvmFeesApiSchema>;
