import { evmChainIdSchema } from 'schema/common';
import { evmAddressSchema } from 'schema/common/evm-address.schema';
import z from 'zod';

export const claimEvmFeesSdkSchema = z.object({
  address: evmAddressSchema,
  target: z.enum(['pool', 'board']),
  chainId: evmChainIdSchema,
});

export type ClaimEvmFeesSdk = z.infer<typeof claimEvmFeesSdkSchema>;
