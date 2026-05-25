import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import z from 'zod';

export const claimEvmFeesSdkSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  address: evmAddressSchema,
  target: z.enum(['pool', 'board']),
  chainId: evmChainIdSchema,
});

export type ClaimEvmFeesSdk = z.infer<typeof claimEvmFeesSdkSchema>;
