import { z } from 'zod';

/**
 * V4 Fee Builder anti-snipe buy limits, for EVM Uniswap/PancakeSwap V4 launches. A
 * discriminated union on `isHookWhitelist`: when `false`, every wallet is capped at
 * `maxBuyPerOrigin`; when `true`, an extra `maxBuyForWhitelisted` cap (>= maxBuyPerOrigin)
 * applies to whitelisted wallets instead.
 */
export const v4BuyLimitsSchema = z.discriminatedUnion('isHookWhitelist', [
  z.object({
    protectPeriod: z
      .number()
      .min(0)
      .max(3600)
      .describe('Protected window after launch, in seconds (0-3600)'),
    maxBuyPerOrigin: z
      .number()
      .min(0)
      .max(10)
      .describe(
        'Max buy per wallet during the protected window, as % of total supply (0-10)',
      ),
    isHookWhitelist: z
      .literal(false)
      .describe('No whitelist - maxBuyPerOrigin applies to every wallet'),
  }),
  z
    .object({
      protectPeriod: z
        .number()
        .min(0)
        .max(3600)
        .describe('Protected window after launch, in seconds (0-3600)'),
      maxBuyPerOrigin: z
        .number()
        .min(0)
        .max(10)
        .describe(
          'Max buy per non-whitelisted wallet, as % of total supply (0-10)',
        ),
      isHookWhitelist: z
        .literal(true)
        .describe(
          'Whitelisted wallets get a higher cap via maxBuyForWhitelisted',
        ),
      maxBuyForWhitelisted: z
        .number()
        .describe(
          'Max buy per whitelisted wallet, as % of total supply; must be >= maxBuyPerOrigin',
        ),
    })
    .refine((data) => data.maxBuyForWhitelisted >= data.maxBuyPerOrigin, {
      message:
        'maxBuyForWhitelisted must be greater than or equal to maxBuyPerOrigin',
      path: ['maxBuyForWhitelisted'],
    }),
]);

export type V4BuyLimitsInput = z.infer<typeof v4BuyLimitsSchema>;
