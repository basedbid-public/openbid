import { SOLANA_ZERO_ADDRESS } from 'constants/solana';
import { slippageSchema } from 'schema/common/slippage.schema';
import { solanaAddressSchema } from 'schema/common/solana-address.schema';
import { z } from 'zod';

export const buySolanaSdkSchema = z.object({
  address: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
  referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS),
});

export type BuySolanaSdk = z.infer<typeof buySolanaSdkSchema>;
