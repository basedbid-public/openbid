import { slippageSchema, solanaAddressSchema } from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const sellSolanaSdkSchema = z
  .object({
    isSandboxMode: z.boolean().default(false),
    chainId: solanaChainIdSchema,
    address: solanaAddressSchema,
    amount: z.number().min(0),
    slippage: slippageSchema,
  })
  .refine((data) => data.isSandboxMode && data.chainId === 501, {
    message:
      'Cannot invoke Solana Mainnet in sandbox mode - use chain ID 5011 instead',
    path: ['chainId'],
  });

export type SellSolanaSdk = z.infer<typeof sellSolanaSdkSchema>;
