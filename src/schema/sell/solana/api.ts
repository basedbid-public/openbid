import { slippageSchema, solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const sellSolanaApiPayloadSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: solanaAddressSchema,
  memeMint: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
});

export type SellSolanaApi = z.infer<typeof sellSolanaApiPayloadSchema>;
