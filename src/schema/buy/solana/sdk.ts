import { SOLANA_ZERO_ADDRESS } from '@constants';
import {
  slippageSchema,
  solanaAddressSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `buySolana`. Caller-facing args; `signer`/`tokenBalance` are not
 * part of this schema - they're derived/fetched internally before being sent to the API
 * (see `./api.ts`).
 */
export const buySolanaSdkSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe(
      'Route through testnet.based.bid (true) instead of mainnet (false)',
    ),
  chainId: solanaChainIdSchema,
  address: solanaAddressSchema.describe('Token mint address to buy'),
  amount: z.number().min(0).describe('Amount to spend, in SOL'),
  slippage: slippageSchema,
  referrer: solanaAddressSchema
    .default(SOLANA_ZERO_ADDRESS)
    .describe(
      'Wallet to credit referral fees to; defaults to the zero address (no referrer)',
    ),
});

export type BuySolanaSdk = z.infer<typeof buySolanaSdkSchema>;
