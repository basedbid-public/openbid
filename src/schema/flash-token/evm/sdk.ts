import {
  CooldownDurationType,
  EvmDexType,
  PenaltyFeeType,
  RewardTokenType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from '@enums';
import {
  evmAddressSchema,
  evmChainIdSchema,
  metadataInputSchema,
  rewardTokenDividendsSchema,
  v4BuyLimitsSchema,
} from '@schema/common';
import { z } from 'zod';
import { distributionAmountUnitSchema } from './api';

/**
 * SDK-INPUT schema for `createEvmFlashToken`. This is what a caller (human or AI agent)
 * passes in - a `logo` file path instead of an uploaded URL, chain-agnostic defaults, and
 * looser optionality than the backend expects. `createEvmFlashToken` validates the raw
 * args against this schema, then builds an `evmFlashTokenCreateApiSchema`-shaped payload
 * (see `./api.ts`) to send to the based.bid API. If you're deciding which schema to use:
 * SDK schemas are for user/agent-facing input, API schemas are the backend wire format.
 */
export const createEvmFlashTokenSchema = z
  .object({
    isSandboxMode: z
      .boolean()
      .default(false)
      .describe(
        'Launch on based.bid testnet (true) instead of mainnet (false)',
      ),
    chainId: evmChainIdSchema,
    initialBuySupplyPercent: z
      .number()
      .min(0)
      .max(99)
      .default(0)
      .describe(
        '% of total supply reserved for the initial buy + distribution wallets (0-99)',
      ),
    distributionWallets: z
      .array(evmAddressSchema)
      .optional()
      .default([])
      .describe(
        'Wallets to receive a share of the initial buy supply (parallel array to distributionAmounts)',
      ),
    distributionAmounts: z
      .array(z.number())
      .optional()
      .default([])
      .describe(
        'Amount (in % or USD, per distributionAmountUnit) each distributionWallets entry receives',
      ),
    distributionAmountUnit: distributionAmountUnitSchema
      .optional()
      .describe(
        'Unit for distributionAmounts: "percent" of supply or "usd" value',
      ),
    token: z.object({
      name: z.string().min(1).max(100).describe('Token name (1-100 chars)'),
      symbol: z
        .string()
        .min(1)
        .max(100)
        .describe('Token symbol/ticker (1-100 chars)'),
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
    }),
    boardTitle: z
      .string()
      .optional()
      .describe(
        'Custom board to launch under. Omit entirely for the default platform board - ' +
          'only set this if the user explicitly names a custom board they created. Requires BASEDBID_API_KEY when non-empty.',
      ),
    sale: z
      .object({
        marketCap: z
          .number()
          .min(1, 'Market cap must be greater than 0')
          .max(10_000_000, 'Market cap must be less than 10K')
          .describe(
            'Starting market cap for the token, in USD (default 10,000 if sale is omitted)',
          ),
        maxTxAmountPercent: z
          .union([
            z.literal(0.001),
            z.literal(0.01),
            z.literal(0.1),
            z.literal(1),
            z.literal(2.5),
            z.literal(5),
          ])
          .optional()
          .describe(
            'Anti-snipe cap: max % of supply a single wallet can hold (default 0.01%)',
          ),
        protectBlocks: z
          .union([
            z.literal(10),
            z.literal(20),
            z.literal(30),
            z.literal(40),
            z.literal(60),
            z.literal(120),
          ])
          .optional()
          .describe(
            'Number of blocks after launch during which maxTxAmountPercent is enforced (default 10)',
          ),
      })
      .optional()
      .describe(
        'Anti-snipe sale settings; omit to use platform defaults (marketCap 10,000, protectBlocks 10)',
      ),
    dex: z
      .object({
        version: z
          .enum(EvmDexType)
          .describe('DEX to launch on: Uniswap or PancakeSwap, V3 or V4'),
        feeTier: z
          .number()
          .describe(
            'DEX fee tier percent: must be 1 for V3, 1-10 for V4 (V4 enables Fee Builder)',
          ),
      })
      .refine(
        (data) => {
          if (
            data.version === EvmDexType.UNISWAP_V4 ||
            data.version === EvmDexType.PANCAKESWAP_V4
          ) {
            return data.feeTier >= 1 && data.feeTier <= 10;
          }
          return data.feeTier === 1;
        },
        {
          message: 'feeTier must be 1 unless version is V4 (then 1-10)',
          path: ['feeTier'],
        },
      ),
    fees: z
      .object({
        // Fee Builder (Uniswap/PancakeSwap V4 only): lets the creator reroute trading
        // fees (up to dex.feeTier%) between liquidity, buybacks, holder rewards, and
        // custom wallets, plus opt into anti-bot/anti-snipe protections.
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
                minTokenBalanceForDividends:
                  rewardTokenDividendsSchema.describe(
                    'Minimum token balance a holder needs to qualify for reward payouts',
                  ),
              })
              .optional()
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
                  percent: z
                    .number()
                    .describe('% of fees routed to this wallet'),
                }),
              )
              .optional()
              .default([])
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
              .optional()
              .default(0.1)
              .describe(
                'Accumulated native-currency balance (ETH/BNB) that triggers a fee distribution payout',
              ),
            tieredFeesEnabled: z
              .boolean()
              .optional()
              .default(false)
              .describe(
                'Scale sell fees up for large sells (>5% of supply: +25% fee, >10%: +40% fee). ' +
                  'Mutually exclusive in practice with dynamicFees - enable one or the other.',
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
                  .describe(
                    'How quickly the volatility measurement decays: fast, medium, or slow',
                  ),
                volatilityMultiplier: z
                  .enum(VolatilityMultiplierType)
                  .describe(
                    'How aggressively fees scale with volatility: low, medium, or high',
                  ),
                volatilityTrigger: z
                  .enum(VolatilityTriggerType)
                  .describe(
                    'When volatility is sampled: per_block or per_epoch',
                  ),
              })
              .optional()
              .describe(
                'Fees that automatically increase during high volatility to discourage dumping',
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
                    'Extra fee charged if a wallet trades again before the cooldown expires: low, medium, or high',
                  ),
              })
              .optional()
              .describe(
                'Rate-limits rapid repeat trading from the same wallet',
              ),
            buyLimits: v4BuyLimitsSchema
              .optional()
              .describe(
                'Anti-snipe buy caps for the launch window, optionally with a higher cap for whitelisted wallets',
              ),
            mevProtectionEnabled: z
              .boolean()
              .optional()
              .describe(
                'Shield against front-running/sandwich attacks (may interfere with some bots/aggregators)',
              ),
          })

          .optional()
          .describe(
            'Uniswap/PancakeSwap V4 Fee Builder config; only valid when dex.version is a V4 DEX',
          ),
      })
      .optional()
      .describe('Fee configuration; omit for platform default fees'),
  })
  .refine(
    (data) => {
      const walletCount = data.distributionWallets?.length ?? 0;
      const amountCount = data.distributionAmounts?.length ?? 0;
      return walletCount === amountCount;
    },
    {
      message:
        'distributionWallets and distributionAmounts must be the same length',
      path: ['distributionAmounts'],
    },
  )
  .refine(
    (data) => {
      if (data.distributionAmountUnit === 'usd') {
        return true;
      }

      const amounts = data.distributionAmounts ?? [];
      if (amounts.length === 0) {
        return true;
      }

      const totalDistribution = amounts.reduce(
        (sum, amount) => sum + amount,
        0,
      );
      return totalDistribution < data.initialBuySupplyPercent;
    },
    {
      message:
        'total of distributionAmounts must be less than initialBuySupplyPercent',
      path: ['distributionAmounts'],
    },
  );

export type CreateFlashTokenEvmSdk = z.infer<typeof createEvmFlashTokenSchema>;
