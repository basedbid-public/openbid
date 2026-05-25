import { SOLANA_ZERO_ADDRESS } from 'constants/solana';
import { slippageSchema, solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const buySolanaApiSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: solanaAddressSchema,
  memeMint: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
  referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS),
  tokenBalance: z.string().optional().default('0'),
  isSandboxMode: z.boolean().default(false),
});

export type BuySolanaApi = z.infer<typeof buySolanaApiSchema>;
