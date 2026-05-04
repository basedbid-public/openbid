import { LaunchPackageType } from '@enums/launch-package.type';
import { EvmDexType } from 'enums/evm';
import {
  CooldownDurationType,
  MaxBuyPerOriginType,
  PenaltyFeeType,
  ProtectPeriodType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from 'enums/fee-builder';
import { RewardTokenType } from 'enums/fee-builder/reward-token.type';
import { z } from 'zod';

export const evmLbpCreateSchema = z
  .object({
    package: z.union([
      z.literal(LaunchPackageType.BASED),
      z.literal(LaunchPackageType.SUPER_BASED),
      z.literal(LaunchPackageType.ULTRA_BASED),
    ]),
    chainId: z.union([
      z.literal(1),
      z.literal(56),
      z.literal(137),
      z.literal(8453),
    ]),
    token: z.object({
      boardTitle: z.string().optional().default('based'),
      name: z.string().max(100, 'Token name must be less than 100 characters'),
      symbol: z
        .string()
        .max(100, 'Token symbol must be less than 100 characters'),
      totalSupply: z.number().min(1, 'Total supply must be greater than 0'),
      initialBuyAmount: z.number().min(0),
      metadata: z.object({
        twitter: z
          .string()
          .regex(/^https:\/\/x\.com\/[a-zA-Z0-9_]+$/, 'Invalid Twitter/X URL')
          .optional(),
        telegram: z
          .string()
          .regex(/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/, 'Invalid Telegram URL')
          .optional(),
        website: z
          .string()
          .regex(
            /^https:\/\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
            'Invalid website URL',
          )
          .optional(),
        discord: z
          .string()
          .regex(
            /^https:\/\/discord\.gg\/[a-zA-Z0-9_]+$/,
            'Invalid Discord URL',
          )
          .optional(),
        description: z
          .string()
          .max(789, 'Description must be less than 789 characters'),
      }),
      marketCap: z
        .number()
        .min(1000, 'Market cap must be at least $1000')
        .max(10000000, 'Market cap must be less than $10M'),
    }),
    sale: z.object({
      startTime: z
        .number()
        .int()
        .min(0)
        .refine(
          (val) => val >= Math.floor(Date.now() / 1000),
          'Start time must be in the future',
        ),
      maxAllocationPerUser: z.number().min(0).max(10),
      maxAllocationPerWhitelistedUser: z.number().min(0).max(10),
      delayTradeTime: z.number().int().min(1).max(3600).optional(),
      whitelistedAddresses: z.array(
        z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
      ),
      softCap: z
        .object({
          amount: z.number(),
          endTime: z
            .number()
            .int()
            .min(0)
            .refine(
              (val) => val >= Math.floor(Date.now() / 1000),
              'End time must be in the future',
            ),
        })
        .optional(),
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
      buyPoolCreator: z.number().min(0).max(1),
      sellPoolCreator: z.number().min(0).max(1),
      buyReferral: z.number().min(0).max(1),
      graduation: z.number().min(0).max(2.5),
      v4: z
        .object({
          liquidity: z.number().min(0).max(10),
          buyback: z.number().min(0).max(10),
          reward: z.object({
            token: z.enum(RewardTokenType),
            amount: z.number(),
            minTokenBalanceForDividends: z.union([
              z.literal(0.01),
              z.literal(0.1),
              z.literal(1),
              z.literal(5),
            ]),
          }),
          customWallets: z.array(
            z.object({
              name: z.string(),
              address: z
                .string()
                .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
              amount: z.number(),
            }),
          ),
          feeThreshold: z.union([
            z.literal(0.01),
            z.literal(0.1),
            z.literal(0.25),
            z.literal(0.5),
            z.literal(1),
          ]),
          tieredFeesEnabled: z.boolean().optional(),
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
          snipeProtection: z
            .object({
              maxBuyPerOrigin: z.enum(MaxBuyPerOriginType),
              protectPeriod: z.enum(ProtectPeriodType),
            })
            .optional(),
          mevProtectionEnabled: z.boolean().optional(),
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
      (sum, wallet) => sum + wallet.amount,
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
