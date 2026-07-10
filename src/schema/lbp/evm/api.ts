import { EvmDexType } from 'enums';
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
  packageIndexSchema,
  saleTimeSchema,
} from 'schema/common';
import { v4BuyLimitsSchema } from 'schema/v4-fees/buy-limits';
import { rewardTokenDividendsSchema } from 'schema/v4-fees/reward-token-dividends';
import { z } from 'zod';

/**
 * API-WIRE schema for the based.bid `/create-lbp` endpoint payload. Built internally by
 * `createLbp` from validated `evmLbpCreateSchema` (./sdk.ts) input - notably swaps the
 * sdk's `LaunchPackageType` enum for a numeric `packageIndex`, and the sdk's local
 * `metadata` (with a `logo` file path) for an uploaded `metadataUrl`.
 */
export const evmLbpCreateApiSchema = z.object({
  package: packageIndexSchema,
  chainId: evmChainIdSchema,
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
    boardTitle: z
      .string()
      .describe(
        'Custom board title; empty string means the default platform board',
      ),
    marketCap: z
      .number()
      .min(1, 'Market cap must be greater than 0')
      .max(10000000, 'Market cap must be less than 10M'),
    startTime: saleTimeSchema(),
    maxAllocationPerUser: z.number(),
    maxAllocationPerWhitelistedUser: z.number(),
    delayTradeTime: z.number(),
    whitelistedAddresses: z.array(
      z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
    ),
    softCap: z
      .object({
        amount: z.number(),
        endTime: saleTimeSchema(),
      })
      .optional(),
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
          minTokenBalanceForDividends: rewardTokenDividendsSchema,
        }),
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
        tieredFeesEnabled: z.boolean().default(false),
        dynamicFees: z.object({
          hasHookDynamicFee: z.boolean(),
          volatilityDecayPeriod: z.enum(VolatilityDecayPeriodType).optional(),
          volatilityMultiplier: z.enum(VolatilityMultiplierType).optional(),
          volatilityTrigger: z.enum(VolatilityTriggerType).optional(),
        }),
        cooldownProtection: z.object({
          cooldownDuration: z.enum(CooldownDurationType),
          penaltyFee: z.enum(PenaltyFeeType),
        }),
        buyLimits: v4BuyLimitsSchema,
        mevProtectionEnabled: z.boolean(),
      })
      .optional(),
  }),
});
export type CreateLbpEvmApi = z.infer<typeof evmLbpCreateApiSchema>;
