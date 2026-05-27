import { EvmDexType } from 'enums/evm';
import {
  CooldownDurationType,
  PenaltyFeeType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from 'enums/fee-builder';
import { RewardTokenType } from 'enums/fee-builder/reward-token.type';
import { evmChainIdSchema, metadataUrlSchema } from 'schema/common';
import { v4BuyLimitsSchema } from 'schema/v4-fees/buy-limits';
import { rewardTokenDividendsSchema } from 'schema/v4-fees/reward-token-dividends';
import { z } from 'zod';

export const evmFlashTokenCreateApiSchema = z.object({
  isSandboxMode: z.boolean().default(false),
  chainId: evmChainIdSchema,
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
                amount: z.number(),
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
});

export type CreateFlashTokenEvmApi = z.infer<
  typeof evmFlashTokenCreateApiSchema
>;
