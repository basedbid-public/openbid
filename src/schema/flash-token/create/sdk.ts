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

const evmFlashTokenCreateSdkSchema = z.object({
  chainId: z.union([
    z.literal(1),
    z.literal(56),
    z.literal(137),
    z.literal(8453),
  ]),
  token: z.object({
    name: z.string().min(1).max(100),
    symbol: z.string().min(1).max(100),
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
        .regex(/^https:\/\/discord\.gg\/[a-zA-Z0-9_]+$/, 'Invalid Discord URL')
        .optional(),
      description: z
        .string()
        .max(789, 'Description must be less than 789 characters'),
    }),
  }),
  sale: z.object({
    boardTitle: z.string().optional().default('based'),
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
  fees: z.object({
    v4: z
      .object({
        liquidity: z.number().min(0).max(10),
        buyback: z.number().min(0).max(10),
        reward: z
          .object({
            token: z.enum(RewardTokenType),
            amount: z.number(),
            minTokenBalanceForDividends: z.union([
              z.literal(0.01),
              z.literal(0.1),
              z.literal(1),
              z.literal(5),
            ]),
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

      .optional(),
  }),
});

export { evmFlashTokenCreateSdkSchema };
