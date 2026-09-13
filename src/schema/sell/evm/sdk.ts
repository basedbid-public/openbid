import { evmAddressSchema, evmChainIdSchema } from '@schema/common';
import z from 'zod';
import { sellEvmApiSchema } from './api';

/** omit `account` as it gets read from the private key elsewhere in the code */
export const sellEvmSdkSchema = sellEvmApiSchema
  .omit({ account: true })
  .extend({
    isSandboxMode: z
      .boolean()
      .default(false)
      .describe(
        'Launch on based.bid testnet (true) instead of mainnet (false)',
      ),
    chainId: evmChainIdSchema,
    address: evmAddressSchema,
    referrer: evmAddressSchema,
  });

export type SellEvmSdk = z.infer<typeof sellEvmSdkSchema>;
