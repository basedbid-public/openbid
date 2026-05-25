import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import { sellEvmApiSchema } from 'schema/sell/evm/api';
import z from 'zod';

export const sellEvmSdkSchema = sellEvmApiSchema.extend({
  isSandboxMode: z.boolean().default(false),
  chainId: evmChainIdSchema,
  address: evmAddressSchema,
  referrer: evmAddressSchema,
});

export type SellEvmSdk = z.infer<typeof sellEvmSdkSchema>;
