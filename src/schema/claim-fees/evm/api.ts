import { evmChainIdSchema } from 'schema/common';
import { evmAddressSchema } from 'schema/common/evm-address.schema';
import z from 'zod';

export const claimEvmFeesApiSchema = z.object({
  address: evmAddressSchema,
  account: evmAddressSchema,
  target: z.enum(['pool', 'board']),
  chainId: evmChainIdSchema,
});

export type ClaimEvmFeesApi = z.infer<typeof claimEvmFeesApiSchema>;
