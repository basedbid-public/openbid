import { z } from 'zod';
import { numberStringSchema } from './numeric-string.schema';
import { solanaAddressSchema } from './solana-address.schema';

/**
 * Shared Solana Fee Builder schema, used by both launch flows
 * (`createFlashTokenSolana` / `createLbpSolana`) and the `token/fee-distribution`
 * API wire payload so the three can never drift apart again.
 *
 * Percent semantics (matching the webapp Fee Builder and the on-chain collect
 * instructions): each `*Percent` is a share of collected fees scaled so that the
 * whole fee-distribution slice maxes out at 50 - the on-chain
 * `MAX_FEE_DISTRIBUTION_PER` cap (500,000 ppm of the 1e6 DENOMINATOR). Values are
 * 2-decimal floats (the webapp posts `pct * 50 / feeTier` rounded to 2 dp), NOT
 * integers, and the six buckets (liquidity/buyback/reward/marketing/creator/custom)
 * must sum to at most 50 - not 100.
 */

/** On-chain `MAX_FEE_DISTRIBUTION_PER` (500,000 ppm) expressed as a percent. */
export const SOLANA_FEE_BUILDER_MAX_TOTAL_PERCENT = 50;

/** Sanity bound on custom fee wallets - each adds a payout account to the collect tx. */
export const SOLANA_FEE_BUILDER_MAX_CUSTOM_FEES = 20;

/** Rounding slack for 2-dp percent cross-checks (float dust + webapp-style rounding). */
const PERCENT_TOLERANCE = 0.011;

const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const solanaFeeBuilderPercentSchema = z
  .number()
  .min(0)
  .max(SOLANA_FEE_BUILDER_MAX_TOTAL_PERCENT)
  .refine(hasAtMostTwoDecimals, {
    message: 'Fee percents support at most 2 decimal places',
  });

/** On-chain amount in atomic units (lamports / token base units) as an integer string. */
export const solanaAtomicAmountStringSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative integer string in atomic units')
  .describe('Amount in atomic units (integer string)');

export const solanaCustomFeeSchema = z.object({
  percent: solanaFeeBuilderPercentSchema.describe(
    '% of collected fees routed to this wallet',
  ),
  walletAddress: solanaAddressSchema.describe('Wallet to receive this fee cut'),
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Label for this payout, e.g. "marketing" or a KOL name'),
});

export type SolanaCustomFee = z.infer<typeof solanaCustomFeeSchema>;

/** Sum of `customFees[].percent`, rounded to 2 dp (webapp-compatible). */
export const sumSolanaCustomFeePercent = (
  customFees: readonly { percent: number }[],
) => round2(customFees.reduce((sum, fee) => sum + fee.percent, 0));

/**
 * Core Fee Builder fields, without cross-field rules. SDK input schemas embed this
 * directly; the API wire schema extends it with stricter required/empty-string
 * variants. Apply {@link solanaFeeBuilderRules} via `.superRefine` after any
 * `.extend` so the rules always run on the final shape.
 */
export const solanaFeeBuilderFieldsSchema = z.object({
  feeDistribution: z
    .boolean()
    .describe(
      'Enable automatic fee distribution across liquidity/buyback/reward/marketing/creator/custom splits',
    ),
  dynamicFee: z
    .boolean()
    .default(false)
    .describe('Enable fees that scale with recent price volatility'),
  liquidityPercent: solanaFeeBuilderPercentSchema.describe(
    '% of collected fees routed to strengthening liquidity',
  ),
  buybackPercent: solanaFeeBuilderPercentSchema.describe(
    '% of collected fees routed to token buybacks',
  ),
  rewardPercent: solanaFeeBuilderPercentSchema.describe(
    '% of collected fees routed to holder reward payouts (requires rewardToken)',
  ),
  marketingPercent: solanaFeeBuilderPercentSchema.describe(
    '% of collected fees routed to the marketing wallet (requires marketingWalletAddress)',
  ),
  creatorPercent: solanaFeeBuilderPercentSchema.describe(
    '% of collected fees routed to the token creator',
  ),
  customFeePercent: solanaFeeBuilderPercentSchema
    .optional()
    .describe(
      '% of collected fees routed to custom wallets; derived from customFees when omitted, ' +
        'must equal the sum of customFees[].percent when provided',
    ),
  marketingWalletAddress: solanaAddressSchema
    .optional()
    .describe(
      'Wallet to receive marketing fees; required when marketingPercent > 0',
    ),
  customFees: z
    .array(solanaCustomFeeSchema)
    .max(SOLANA_FEE_BUILDER_MAX_CUSTOM_FEES)
    .default([])
    .describe(
      'Extra fixed fee splits to arbitrary wallets, summing to customFeePercent',
    ),
  collectQuoteThreshold: solanaAtomicAmountStringSchema.describe(
    'Accumulated quote-token (SOL) balance in atomic units (lamports) that triggers a fee distribution payout',
  ),
  collectBaseThreshold: solanaAtomicAmountStringSchema.describe(
    'Accumulated base-token balance in atomic units that triggers a fee distribution payout',
  ),
  feeDistributionPayoutKind: z
    .literal('SOL')
    .default('SOL')
    .describe(
      'Currency fee payouts are made in; currently only "SOL" is supported',
    ),
  feeDistributionPayoutCustomMint: z
    .string()
    .default('')
    .describe(
      'Reserved for a future custom payout mint; leave as the default empty string',
    ),
  rewardToken: solanaAddressSchema
    .optional()
    .describe(
      'Token mint holder rewards are paid in; required when rewardPercent > 0',
    ),
  minTokenBalanceForDividends: numberStringSchema().describe(
    'Minimum token balance a holder needs to qualify for reward payouts, as a numeric string',
  ),
});

export type SolanaFeeBuilderFields = z.infer<
  typeof solanaFeeBuilderFieldsSchema
>;

/**
 * Structural view of the fields {@link solanaFeeBuilderRules} needs, so the same
 * rules run against the SDK schemas (optional customFeePercent/rewardToken) and
 * the wire schema (required, `''` for absent) alike.
 */
export interface SolanaFeeBuilderRuleFields {
  feeDistribution: boolean;
  liquidityPercent: number;
  buybackPercent: number;
  rewardPercent: number;
  marketingPercent: number;
  creatorPercent: number;
  customFeePercent?: number;
  marketingWalletAddress?: string;
  rewardToken?: string;
  customFees: { percent: number; walletAddress: string; name: string }[];
}

/**
 * Cross-field Fee Builder rules, previously unenforced (or enforced differently
 * per copy of the schema): bucket total within the on-chain 50% cap,
 * customFeePercent consistent with customFees, conditional wallet/mint
 * requirements, and no duplicate custom wallets.
 */
export const solanaFeeBuilderRules = (
  data: SolanaFeeBuilderRuleFields,
  ctx: z.RefinementCtx,
): void => {
  const customSum = sumSolanaCustomFeePercent(data.customFees);

  if (
    data.customFeePercent !== undefined &&
    Math.abs(data.customFeePercent - customSum) > PERCENT_TOLERANCE
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['customFeePercent'],
      message: `customFeePercent (${data.customFeePercent}) must equal the sum of customFees[].percent (${customSum})`,
    });
  }

  const totalPercent = round2(
    data.liquidityPercent +
      data.buybackPercent +
      data.rewardPercent +
      data.marketingPercent +
      data.creatorPercent +
      (data.customFeePercent ?? customSum),
  );

  if (totalPercent > SOLANA_FEE_BUILDER_MAX_TOTAL_PERCENT + PERCENT_TOLERANCE) {
    ctx.addIssue({
      code: 'custom',
      message:
        `Fee splits total ${totalPercent}% but the on-chain fee-distribution cap ` +
        `(MAX_FEE_DISTRIBUTION_PER) is ${SOLANA_FEE_BUILDER_MAX_TOTAL_PERCENT}%`,
    });
  }

  if (data.feeDistribution && totalPercent <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['feeDistribution'],
      message:
        'feeDistribution is enabled but every fee split is 0 - allocate at least one split or disable feeDistribution',
    });
  }

  if (data.marketingPercent > 0 && !data.marketingWalletAddress) {
    ctx.addIssue({
      code: 'custom',
      path: ['marketingWalletAddress'],
      message:
        'marketingWalletAddress is required when marketingPercent is greater than 0',
    });
  }

  if (data.rewardPercent > 0 && !data.rewardToken) {
    ctx.addIssue({
      code: 'custom',
      path: ['rewardToken'],
      message: 'rewardToken is required when rewardPercent is greater than 0',
    });
  }

  const seenWallets = new Set<string>();
  data.customFees.forEach((fee, index) => {
    if (seenWallets.has(fee.walletAddress)) {
      ctx.addIssue({
        code: 'custom',
        path: ['customFees', index, 'walletAddress'],
        message: `Duplicate custom fee wallet: ${fee.walletAddress}`,
      });
    }
    seenWallets.add(fee.walletAddress);
  });
};

/** SDK-input Fee Builder schema: core fields + cross-field rules. */
export const solanaFeeBuilderSdkSchema =
  solanaFeeBuilderFieldsSchema.superRefine(solanaFeeBuilderRules);
