import { EvmDexType, LaunchPackageType } from 'enums';
import {
  CooldownDurationType,
  PenaltyFeeType,
  RewardTokenType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from 'enums/fee-builder';
import {
  evmChainIdSchema,
  metadataInputSchema,
  saleTimeSchema,
} from 'schema/common';
import { v4BuyLimitsSchema } from 'schema/v4-fees/buy-limits';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createLbp` (Liquidity Bootstrapping Pool launch on EVM). This is
 * caller/agent-facing input - `createLbp` validates against this, uploads metadata to
 * IPFS, then builds an `evmLbpCreateApiSchema`-shaped payload (see `./api.ts`, which uses
 * a numeric `packageIndex` instead of the `LaunchPackageType` enum used here) to send to
 * the based.bid API. Unlike Flash Tokens, LBPs have a sale period before trading opens.
 */
export const evmLbpCreateSchema = z
  .object({
    isSandboxMode: z
      .boolean()
      .default(false)
      .describe(
        'Accepted for API parity with Solana but has no effect on EVM - always mainnet',
      ),
    package: z
      .enum(LaunchPackageType)
      .default(LaunchPackageType.BASED)
      .describe(
        'Launch tier: BASED (free), SUPER_BASED (sale alerts), or ULTRA_BASED (sale + buy alerts)',
      ),
    chainId: evmChainIdSchema,
    token: z.object({
      boardTitle: z
        .string()
        .optional()
        .describe(
          'Custom board to launch under. Omit entirely for the default platform board - ' +
            'only set when the user explicitly names a custom board. Requires BASEDBID_API_KEY when non-empty.',
        ),
      name: z
        .string()
        .max(100, 'Token name must be less than 100 characters')
        .describe('Token name (max 100 chars)'),
      symbol: z
        .string()
        .max(100, 'Token symbol must be less than 100 characters')
        .describe('Token symbol/ticker (max 100 chars)'),
      totalSupply: z
        .number()
        .min(1, 'Total supply must be greater than 0')
        .describe('Total token supply to mint'),
      initialBuyAmount: z
        .number()
        .min(0)
        .describe(
          'Amount of native currency (ETH/BNB) the creator spends to buy in at launch',
        ),
      metadata: metadataInputSchema,
      marketCap: z
        .number()
        .min(1000, 'Market cap must be at least $1000')
        .max(10000000, 'Market cap must be less than $10M')
        .describe('Starting market cap for the token, in USD ($1,000-$10M)'),
    }),
    sale: z.object({
      startTime: saleTimeSchema(),
      maxAllocationPerUser: z
        .number()
        .min(0)
        .max(10)
        .describe(
          'Max % of supply any single (non-whitelisted) wallet can buy during the sale',
        ),
      maxAllocationPerWhitelistedUser: z
        .number()
        .min(0)
        .max(10)
        .describe(
          'Max % of supply a whitelisted wallet can buy during the sale',
        ),
      delayTradeTime: z
        .int()
        .optional()
        .describe('Seconds after sale start before secondary trading opens'),
      whitelistedAddresses: z
        .array(z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'))
        .describe(
          'Wallets allowed to buy at maxAllocationPerWhitelistedUser during the sale (empty = no whitelist)',
        ),
      softCap: z
        .object({
          amount: z
            .number()
            .describe(
              'Minimum raise amount for the sale to be considered successful',
            ),
          endTime: saleTimeSchema(),
        })
        .optional()
        .describe('Optional minimum-raise safety net for the sale'),
    }),
    dex: z
      .object({
        version: z.enum(EvmDexType),
        feeTier: z.number(),
      })
      .refine(
        (data) => {
          if (
            data.version === EvmDexType.UNISWAP_V4 ||
            data.version === EvmDexType.PANCAKESWAP_V4
          ) {
            return (
              data.feeTier >= 1 && data.feeTier <= 10 && data.feeTier % 1 === 0
            );
          }
          return data.feeTier === 1;
        },
        {
          message: 'feeTier must be 1 unless version is V4 (then 1-10)',
          path: ['feeTier'],
        },
      ),
    fees: z.object({
      buyPoolCreator: z
        .number()
        .min(0)
        .max(1)
        .describe('Fee (%) to the pool creator on each buy, max 1%'),
      sellPoolCreator: z
        .number()
        .min(0)
        .max(1)
        .describe('Fee (%) to the pool creator on each sell, max 1%'),
      buyReferral: z
        .number()
        .min(0)
        .max(1)
        .describe('Fee (%) allocated to referrers on buys, max 1%'),
      graduation: z
        .number()
        .min(0)
        .max(2.5)
        .describe('Fee (%) taken when the sale finalizes/graduates, max 2.5%'),
      // V4 Fee Builder (Uniswap/PancakeSwap V4 only) - see schema/flash-token/evm/sdk.ts
      // for the fully-documented version of this same shape. Total of
      // liquidity + buyback + reward.percent + customWallets.percent amounts must equal dex.feeTier.
      v4: z
        .object({
          liquidity: z
            .number()
            .min(0)
            .max(10)
            .describe('% of fees routed to strengthening liquidity'),
          buyback: z
            .number()
            .min(0)
            .max(10)
            .describe('% of fees routed to token buybacks'),
          reward: z
            .object({
              token: z
                .enum(RewardTokenType)
                .describe('Currency holder rewards are paid in'),
              amount: z
                .number()
                .describe('% of fees routed to holder reward payouts'),
              minTokenBalanceForDividends: z
                .union([
                  z.literal(0.01),
                  z.literal(0.1),
                  z.literal(1),
                  z.literal(5),
                ])
                .describe(
                  'Minimum token balance a holder needs to qualify for reward payouts',
                ),
            })
            .describe(
              'Airdrop-style payouts to long-term holders, funded from trading fees',
            ),
          customWallets: z
            .array(
              z.object({
                name: z
                  .string()
                  .describe(
                    'Label for this payout, e.g. "marketing" or a KOL name',
                  ),
                address: z
                  .string()
                  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address')
                  .describe('Wallet address to receive this fee cut'),
                percent: z.number().describe('% of fees routed to this wallet'),
              }),
            )
            .describe(
              'Extra fixed fee splits to arbitrary wallets (e.g. marketing, KOLs)',
            ),
          feeThreshold: z
            .union([
              z.literal(0.01),
              z.literal(0.1),
              z.literal(0.25),
              z.literal(0.5),
              z.literal(1),
            ])
            .describe(
              'Accumulated native-currency balance that triggers a fee distribution payout',
            ),
          tieredFeesEnabled: z
            .boolean()
            .default(false)
            .describe(
              'Scale sell fees up for large sells; mutually exclusive with dynamicFees',
            ),
          dynamicFees: z
            .object({
              hasHookDynamicFee: z
                .boolean()
                .describe(
                  'Enable fees that scale with recent price volatility',
                ),
              volatilityDecayPeriod: z
                .enum(VolatilityDecayPeriodType)
                .optional()
                .describe(
                  'How quickly the volatility measurement decays: fast, medium, or slow',
                ),
              volatilityMultiplier: z
                .enum(VolatilityMultiplierType)
                .optional()
                .describe(
                  'How aggressively fees scale with volatility: low, medium, or high',
                ),
              volatilityTrigger: z
                .enum(VolatilityTriggerType)
                .optional()
                .describe('When volatility is sampled: per_block or per_epoch'),
            })
            .optional()
            .default({
              hasHookDynamicFee: false,
            })
            .describe(
              'Fees that automatically increase during high volatility; mutually exclusive with tieredFeesEnabled',
            ),
          cooldownProtection: z
            .object({
              cooldownDuration: z
                .enum(CooldownDurationType)
                .describe(
                  'How long a wallet must wait between trades: short, medium, or long',
                ),
              penaltyFee: z
                .enum(PenaltyFeeType)
                .describe(
                  'Extra fee if a wallet trades again before cooldown expires: low, medium, or high',
                ),
            })
            .describe('Rate-limits rapid repeat trading from the same wallet'),
          buyLimits: v4BuyLimitsSchema.describe(
            'Anti-snipe buy caps for the launch window, optionally with a higher cap for whitelisted wallets',
          ),
          mevProtectionEnabled: z
            .boolean()
            .default(false)
            .describe(
              'Shield against front-running/sandwich attacks (may interfere with some bots/aggregators)',
            ),
        })
        .refine(
          (data) => {
            if (
              data.tieredFeesEnabled === true &&
              data.dynamicFees?.hasHookDynamicFee === true
            ) {
              return false;
            }
            return true;
          },
          {
            message:
              'Exactly one of tieredFeesEnabled or dynamicFees must be defined',
          },
        )
        .optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.fees.v4) {
      return;
    }

    const customWalletsAmount = data.fees.v4.customWallets.reduce(
      (sum, wallet) => sum + wallet.percent,
      0,
    );

    const totalV4Fee =
      data.fees.v4.liquidity +
      data.fees.v4.buyback +
      data.fees.v4.reward.amount +
      customWalletsAmount;

    if (Math.abs(totalV4Fee - data.dex.feeTier) > Number.EPSILON) {
      ctx.addIssue({
        code: 'invalid_value',
        values: [
          totalV4Fee,
          data.dex.feeTier,
          'liquidity + buyback + reward.amount + customWallets.amount sum must equal dex.feeTier',
        ],
        path: ['fees', 'v4'],
        message:
          'liquidity + buyback + reward.amount + customWallets.amount sum must equal dex.feeTier',
      });
    }
  });

export type CreateLbpEvmSdk = z.infer<typeof evmLbpCreateSchema>;
