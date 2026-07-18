import { evmAddressSchema, evmChainIdSchema } from '@schema/common';
import z from 'zod';
import { sellEvmApiSchema } from './api';

/**
 * SDK-INPUT schema for `sell`. Extends the API schema (./api.ts) rather than mirroring
 * it field-by-field - it only adds `isSandboxMode`, which the API payload doesn't need.
 * Note `account` (seller wallet) IS required here, unlike buy, since sell doesn't
 * auto-derive it.
 */
export const sellEvmSdkSchema = sellEvmApiSchema.extend({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe('Launch on based.bid testnet (true) instead of mainnet (false)'),
  chainId: evmChainIdSchema,
  address: evmAddressSchema,
  referrer: evmAddressSchema,
});

export type SellEvmSdk = z.infer<typeof sellEvmSdkSchema>;
