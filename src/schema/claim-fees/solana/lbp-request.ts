import { solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import z from 'zod';

export const claimSolanaLbpFeesRequestSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  chainId: solanaChainIdSchema,
  memeMint: solanaAddressSchema,
});

export type ClaimSolanaLbpFeesRequest = z.infer<
  typeof claimSolanaLbpFeesRequestSchema
>;
