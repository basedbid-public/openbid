import { solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import z from 'zod';

export const claimSolanaFlashTokenFeesRequestSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  chainId: solanaChainIdSchema,
  flashMint: solanaAddressSchema,
});

export type ClaimSolanaFlashTokenFeesRequest = z.infer<
  typeof claimSolanaFlashTokenFeesRequestSchema
>;
