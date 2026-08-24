import { CooldownDurationType, PenaltyFeeType } from '@enums';
import {
  evmAddressSchema,
  evmChainIdSchema,
  rewardTokenDividendsSchema,
  rwaObjectSchema,
} from '@schema/common';
import { z } from 'zod';

const feeThresholdSchema = z.union([
  z.literal(0.01),
  z.literal(0.1),
  z.literal(0.25),
  z.literal(0.5),
  z.literal(1),
]);

/** Custom wallet fee split as used by update-hook (`pct` matches the API docs). */
const updateHookCustomWalletObjectSchema = z.object({
  id: z
    .string()
    .optional()
    .describe(
      'Stable custom-wallet id (used as key in rwa.customWalletRewards)',
    ),
  name: z.string().optional().describe('Human-readable label'),
  address: evmAddressSchema.describe('Wallet receiving this fee cut'),
  pct: z
    .number()
    .min(0)
    .optional()
    .describe('Share of hook fees routed to this wallet (percent semantics)'),
  percent: z.number().min(0).optional().describe('Alias for pct'),
});

/**
 * Partial V4 fee / protection patch for `update-hook`.
 * Omit fields you are not changing — the API merges over the live hook snapshot.
 */
export const updateHookFeesV4Schema = z
  .object({
    liquidity: z
      .number()
      .min(0)
      .optional()
      .describe('% of hook fees to liquidity (relative share)'),
    buyback: z
      .number()
      .min(0)
      .optional()
      .describe('% of hook fees to buybacks (relative share)'),
    rewardsPct: z
      .number()
      .min(0)
      .optional()
      .describe('% of hook fees to the rewards basket (relative share)'),
    creatorPct: z
      .number()
      .min(0)
      .optional()
      .describe('% of hook fees to the creator (relative share)'),
    liquidityFeeBps: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe('Absolute liquidity distribution bps'),
    buybackFeeBps: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe('Absolute buyback distribution bps'),
    rewardFeeBps: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe('Absolute reward distribution bps'),
    liquidityFee: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe('Alias for liquidityFeeBps'),
    buybackFee: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe('Alias for buybackFeeBps'),
    rewardFee: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe('Alias for rewardFeeBps'),
    feeThreshold: feeThresholdSchema
      .optional()
      .describe(
        'Accumulated native balance that triggers a fee distribution payout',
      ),
    walletThreshold: rewardTokenDividendsSchema
      .optional()
      .describe('Minimum token balance for reward eligibility'),
    minTokenBalanceWei: z
      .union([z.string(), z.number()])
      .optional()
      .describe(
        'Raw wei minimum balance for dividends (alternative to walletThreshold)',
      ),
    customWallets: z
      .union([
        z.array(updateHookCustomWalletObjectSchema),
        z.array(evmAddressSchema),
      ])
      .optional()
      .describe(
        'Custom fee recipients — objects with address/pct, or parallel address list with customWalletBps',
      ),
    customWalletBps: z
      .array(z.number().int().min(0).max(10_000))
      .optional()
      .describe(
        'Parallel bps for customWallets when customWallets is an address array',
      ),
    mevProtectionEnabled: z
      .boolean()
      .optional()
      .describe('Enable/disable anti-sandwich / MEV protection'),
    isAntiSandwich: z
      .boolean()
      .optional()
      .describe('Alias for mevProtectionEnabled'),
    cooldownProtection: z
      .object({
        enabled: z.boolean().optional(),
        cooldownDuration: z.enum(CooldownDurationType).optional(),
        penaltyFee: z.enum(PenaltyFeeType).optional(),
      })
      .optional()
      .describe('Cooldown / penalty fee config for rapid re-trading'),
  })
  .describe('Partial V4 fee-builder / protection patch');

/**
 * SDK-INPUT schema for `updateEvmHook`. Builds wallet-ready BasedBidHook writes for an
 * existing Flash or graduated LBP token. Partial patches only — omit groups you are not
 * changing. See `./api.ts` for the wire payload (`stock` tickers already resolved).
 */
export const updateEvmHookSdkSchema = z
  .object({
    isSandboxMode: z
      .boolean()
      .default(false)
      .describe(
        'Use testnet CDN API (true) instead of mainnet static API (false)',
      ),
    tokenAddress: evmAddressSchema.describe('Project token address to update'),
    chainId: evmChainIdSchema,
    fees: z
      .object({
        v4: updateHookFeesV4Schema.optional(),
      })
      .optional()
      .describe('Fee / protection updates under fees.v4'),
    rwa: rwaObjectSchema
      .optional()
      .describe(
        'Rewards basket update; prefer stock tickers (AAPL) — resolved to addresses before the API call',
      ),
  })
  .superRefine((data, ctx) => {
    if (!data.fees?.v4 && !data.rwa) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide at least one of fees.v4 or rwa',
        path: ['fees'],
      });
    }
  });

export type UpdateEvmHookSdk = z.infer<typeof updateEvmHookSdkSchema>;
export type UpdateHookFeesV4 = z.infer<typeof updateHookFeesV4Schema>;
