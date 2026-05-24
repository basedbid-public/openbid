import { SOLANA_ZERO_ADDRESS } from 'constants/solana';
import { numberStringSchema } from 'schema/common';
import { slippageSchema } from 'schema/common/slippage.schema';
import { solanaAddressSchema } from 'schema/common/solana-address.schema';
import { z } from 'zod';

export const buySolanaApiSchema = z.object({
  chainId: z.literal(5011),
  signer: solanaAddressSchema,
  memeMint: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
  referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS),
  tokenBalance: numberStringSchema,
});

export type BuySolanaApi = z.infer<typeof buySolanaApiSchema>;
