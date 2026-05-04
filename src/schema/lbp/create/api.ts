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

export const evmLbpCreateApiSchema = z.object({
  package: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  chainId: z.union([
    z.literal(1),
    z.literal(56),
    z.literal(137),
    z.literal(8453),
  ]),
  token: z.object({
    name: z.string().max(100, 'Token name must be less than 100 characters'),
    symbol: z
      .string()
      .max(100, 'Token symbol must be less than 100 characters'),
    totalSupply: z.number().min(1, 'Total supply must be greater than 0'),
    initialBuyAmount: z.number().min(0),
    metadataUrl: z
      .string()
      .regex(
        /^https:\/\/ipfs.based.bid\/ipfs\/.+/,
        'Metadata must be a valid ipfs.based.bid URL',
      ),
  }),
  sale: z.object({
    boardTitle: z.string(),
    marketCap: z
      .number()
      .min(1, 'Market cap must be greater than 0')
      .max(10000000, 'Market cap must be less than 10M'),
    startTime: z
      .number()
      .int()
      .min(0)
      .refine(
        (val) => val >= Math.floor(Date.now() / 1000),
        'Start time must be in the future',
      ),
    maxAllocationPerUser: z.number(),
    maxAllocationPerWhitelistedUser: z.number(),
    delayTradeTime: z.number(),
    whitelistedAddresses: z.array(
      z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
    ),
    softCap: z.object({
      amount: z.number(),
      endTime: z
        .number()
        .int()
        .min(0)
        .refine(
          (val) => val >= Math.floor(Date.now() / 1000),
          'End time must be in the future',
        ),
    }),
  }),
  dex: z.object({
    version: z.enum(EvmDexType),
    feeTier: z.number().min(1).max(10),
  }),
  fees: z.object({
    buyPoolCreator: z.number().min(0).max(0.01),
    sellPoolCreator: z.number().min(0).max(0.01),
    buyReferral: z.number().min(0).max(0.01),
    graduation: z.number().min(0).max(0.025),
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
        feeThreshold: z.number(),
        tieredFeesEnabled: z.boolean(),
        dynamicFees: z.object({
          hasHookDynamicFee: z.boolean(),
          volatilityDecayPeriod: z.enum(VolatilityDecayPeriodType),
          volatilityMultiplier: z.enum(VolatilityMultiplierType),
          volatilityTrigger: z.enum(VolatilityTriggerType),
        }),
        cooldownProtection: z.object({
          cooldownDuration: z.enum(CooldownDurationType),
          penaltyFee: z.enum(PenaltyFeeType),
        }),
        snipeProtection: z.object({
          maxBuyPerOrigin: z.enum(MaxBuyPerOriginType),
          protectPeriod: z.enum(ProtectPeriodType),
        }),
        mevProtectionEnabled: z.boolean(),
      })
      .optional(),
  }),
});
