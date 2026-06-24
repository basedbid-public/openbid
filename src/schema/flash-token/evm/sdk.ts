import { EvmDexType } from 'enums';
import {
  CooldownDurationType,
  PenaltyFeeType,
  RewardTokenType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from 'enums/fee-builder';
import { evmChainIdSchema, metadataInputSchema } from 'schema/common';
import { evmAddressSchema } from 'schema/common/evm-address.schema';
import { v4BuyLimitsSchema } from 'schema/v4-fees/buy-limits';
import { rewardTokenDividendsSchema } from 'schema/v4-fees/reward-token-dividends';
import { z } from 'zod';
import { distributionAmountUnitSchema } from './api';

export const createEvmFlashTokenSchema = z
  .object({
    isSandboxMode: z.boolean().default(false),
    chainId: evmChainIdSchema,
    initialBuySupplyPercent: z.number().min(0).max(99).default(0),
    distributionWallets: z.array(evmAddressSchema).optional().default([]),
    distributionAmounts: z.array(z.number()).optional().default([]),
    distributionAmountUnit: distributionAmountUnitSchema.optional(),
    token: z.object({
      name: z.string().min(1).max(100),
      symbol: z.string().min(1).max(100),
      totalSupply: z.number().min(1, 'Total supply must be greater than 0'),
      initialBuyAmount: z.number().min(0),
      metadata: metadataInputSchema,
    }),
    boardTitle: z.string().optional(),
    sale: z
      .object({
        marketCap: z
          .number()
          .min(1, 'Market cap must be greater than 0')
          .max(10_000_000, 'Market cap must be less than 10K'),
        maxTxAmountPercent: z
          .union([
            z.literal(0.001),
            z.literal(0.01),
            z.literal(0.1),
            z.literal(1),
            z.literal(2.5),
            z.literal(5),
          ])
          .optional(),
        protectBlocks: z
          .union([
            z.literal(10),
            z.literal(20),
            z.literal(30),
            z.literal(40),
            z.literal(60),
            z.literal(120),
          ])
          .optional(),
      })
      .optional(),
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
        v4: z
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
            customWallets: z
              .array(
                z.object({
                  name: z.string(),
                  address: z
                    .string()
                    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
                  amount: z.number(),
                }),
              )
              .optional()
              .default([]),
            feeThreshold: z
              .union([
                z.literal(0.01),
                z.literal(0.1),
                z.literal(0.25),
                z.literal(0.5),
                z.literal(1),
              ])
              .optional()
              .default(0.1),
            tieredFeesEnabled: z.boolean().optional().default(false),
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
            mevProtectionEnabled: z.boolean().optional(),
          })

          .optional(),
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
