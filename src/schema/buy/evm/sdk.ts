import { evmAddressSchema, evmChainIdSchema } from 'schema/common';
import z from 'zod';

/**
 * SDK schema for `buyEvm`. Caller-facing args; `account` is deliberately absent -
 * it's derived from `PRIVATE_KEY` internally rather than passed in. See `./api.ts` for
 * the backend payload shape (adds the derived `account`).
 */
export const buyEvmSdkSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe('Launch on based.bid testnet (true) instead of mainnet (false)'),
  chainId: evmChainIdSchema,
  address: evmAddressSchema.describe(
    'Token or LBP contract address to buy from',
  ),
  slippage: z
    .union([z.literal(1), z.literal(5), z.literal(10)])
    .describe('Max acceptable slippage percent: 1, 5, or 10'),
  referrer: evmAddressSchema.describe(
    'Wallet to credit referral fees to; use the zero address for no referrer',
  ),
  amount: z
    .number()
    .min(0)
    .describe('Amount to spend, in the chain native currency (ETH/BNB)'),
});

export type BuyEvmSdk = z.infer<typeof buyEvmSdkSchema>;
