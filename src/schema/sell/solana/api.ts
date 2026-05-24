import { slippageSchema } from 'schema/common/slippage.schema';
import { solanaAddressSchema } from 'schema/common/solana-address.schema';
import { z } from 'zod';

export const sellSolanaApiPayloadSchema = z.object({
  chainId: z.literal(5011),
  signer: solanaAddressSchema,
  memeMint: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
});

export type SellSolanaApi = z.infer<typeof sellSolanaApiPayloadSchema>;
