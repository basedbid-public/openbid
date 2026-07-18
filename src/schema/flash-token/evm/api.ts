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
  metadataUrlSchema,
  rewardTokenDividendsSchema,
  v4BuyLimitsSchema,
} from '@schema/common';
import { z } from 'zod';

export const distributionAmountUnitSchema = z.enum(['percent', 'usd']);

/**
 * API-WIRE schema for the based.bid `/create-flash` endpoint payload. This is NOT what
 * callers construct directly - `createEvmFlashToken` builds this shape internally from
 * validated `createEvmFlashTokenSchema` (sdk.ts) input plus derived values (e.g. an
 * uploaded `metadataUrl` in place of the sdk's local `logo` path). Used to validate the
 * outgoing request before it's sent to the API.
 */
export const evmFlashTokenCreateApiSchema = z
  .object({
    isSandboxMode: z.boolean().default(false),
    chainId: evmChainIdSchema,
    initialBuySupplyPercent: z.number().min(0).max(99),
    distributionWallets: z.array(evmAddressSchema).optional(),
    distributionAmounts: z.array(z.number()).optional(),
    distributionAmountUnit: distributionAmountUnitSchema.optional(),
    token: z.object({
      name: z.string().max(100, 'Token name must be less than 100 characters'),
      symbol: z
        .string()
        .max(100, 'Token symbol must be less than 100 characters'),
      totalSupply: z.number().min(1, 'Total supply must be greater than 0'),
      initialBuyAmount: z.number().min(0),
      metadataUrl: metadataUrlSchema,
    }),
    sale: z.object({
      boardTitle: z.string().default('based').optional(),
      marketCap: z
        .number()
        .min(1, 'Market cap must be greater than 0')
        .max(10000000, 'Market cap must be less than 10M'),
      maxTxAmountPercent: z.union([
        z.literal(0.001),
        z.literal(0.01),
        z.literal(0.1),
        z.literal(1),
        z.literal(2.5),
        z.literal(5),
      ]),
      protectBlocks: z.union([
        z.literal(10),
        z.literal(20),
        z.literal(30),
        z.literal(40),
        z.literal(60),
        z.literal(120),
      ]),
    }),
    dex: z.object({
      version: z.enum(EvmDexType),
      feeTier: z.number().min(1).max(10),
    }),
    fees: z
      .object({
        v4: z.union([
          z.literal(false),
          z
            .object({
              liquidity: z.number().min(0).max(10),
              buyback: z.number().min(0).max(10),
              reward: z
                .object({
                  token: z.enum(RewardTokenType),
                  amount: z.number(),
                  minTokenBalanceForDividends: rewardTokenDividendsSchema,
                })
                .optional(),
              customWallets: z.array(
                z.object({
                  name: z.string(),
                  address: z
                    .string()
                    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
                  percent: z.number(),
                }),
              ),
              feeThreshold: z.number(),
              tieredFeesEnabled: z.boolean(),
              dynamicFees: z
                .object({
                  hasHookDynamicFee: z.boolean(),
                  volatilityDecayPeriod: z.enum(VolatilityDecayPeriodType),
                  volatilityMultiplier: z.enum(VolatilityMultiplierType),
                  volatilityTrigger: z.enum(VolatilityTriggerType),
                })
                .optional(),
              cooldownProtection: z
                .object({
                  cooldownDuration: z.enum(CooldownDurationType),
                  penaltyFee: z.enum(PenaltyFeeType),
                })
                .optional(),
              buyLimits: v4BuyLimitsSchema.optional(),
              mevProtectionEnabled: z.boolean().default(false).optional(),
            })
            .optional(),
        ]),
      })
      .optional(),
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
  );

export type DistributionAmountUnit = z.infer<
  typeof distributionAmountUnitSchema
>;

export type CreateFlashTokenEvmApi = z.infer<
  typeof evmFlashTokenCreateApiSchema
>;
