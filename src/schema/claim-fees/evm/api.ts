import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import z from 'zod';

export const claimEvmFeesApiSchema = z.object({
  address: evmAddressSchema,
  account: evmAddressSchema,
  target: z.enum(['pool', 'board']),
  chainId: evmChainIdSchema,
});

export type ClaimEvmFeesApi = z.infer<typeof claimEvmFeesApiSchema>;
