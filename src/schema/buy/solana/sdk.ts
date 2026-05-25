import { SOLANA_ZERO_ADDRESS } from 'constants/solana';
import { slippageSchema, solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const buySolanaSdkSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  chainId: solanaChainIdSchema,
  address: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
  referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS),
});

export type BuySolanaSdk = z.infer<typeof buySolanaSdkSchema>;
