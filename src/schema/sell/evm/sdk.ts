import { evmChainIdSchema } from 'schema/common';
import { evmAddressSchema } from 'schema/common/evm-address.schema';
import { sellEvmApiSchema } from 'schema/sell/evm/api';
import z from 'zod';

export const sellEvmSdkSchema = sellEvmApiSchema.extend({
  chainId: evmChainIdSchema,
  address: evmAddressSchema,
  referrer: evmAddressSchema,
});

export type SellEvmSdk = z.infer<typeof sellEvmSdkSchema>;
