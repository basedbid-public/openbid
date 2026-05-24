import { slippageSchema } from 'schema/common/slippage.schema';
import { solanaAddressSchema } from 'schema/common/solana-address.schema';
import { z } from 'zod';

export const sellSolanaSdkSchema = z.object({
  address: solanaAddressSchema,
  amount: z.number().min(0),
  slippage: slippageSchema,
});

export type SellSolanaSdk = z.infer<typeof sellSolanaSdkSchema>;
