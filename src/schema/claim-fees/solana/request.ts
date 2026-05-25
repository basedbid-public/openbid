import { solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import z from 'zod';

export const claimFeesSolanaRequestSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  chainId: solanaChainIdSchema,
  address: solanaAddressSchema,
});

export type ClaimFeesSolanaRequest = z.infer<
  typeof claimFeesSolanaRequestSchema
>;
