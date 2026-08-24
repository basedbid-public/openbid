import { CooldownDurationType, PenaltyFeeType } from '@enums';
import {
  evmAddressSchema,
  evmChainIdSchema,
  rewardTokenDividendsSchema,
  rwaBasketModeSchema,
} from '@schema/common';
import { z } from 'zod';

const feeThresholdSchema = z.union([
  z.literal(0.01),
  z.literal(0.1),
  z.literal(0.25),
  z.literal(0.5),
  z.literal(1),
]);

const updateHookCustomWalletObjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  address: evmAddressSchema,
  pct: z.number().min(0).optional(),
  percent: z.number().min(0).optional(),
});

const updateHookFeesV4ApiSchema = z.object({
  liquidity: z.number().min(0).optional(),
  buyback: z.number().min(0).optional(),
  rewardsPct: z.number().min(0).optional(),
  creatorPct: z.number().min(0).optional(),
  liquidityFeeBps: z.number().int().min(0).max(10_000).optional(),
  buybackFeeBps: z.number().int().min(0).max(10_000).optional(),
  rewardFeeBps: z.number().int().min(0).max(10_000).optional(),
  liquidityFee: z.number().int().min(0).max(10_000).optional(),
  buybackFee: z.number().int().min(0).max(10_000).optional(),
  rewardFee: z.number().int().min(0).max(10_000).optional(),
  feeThreshold: feeThresholdSchema.optional(),
  walletThreshold: rewardTokenDividendsSchema.optional(),
  minTokenBalanceWei: z.union([z.string(), z.number()]).optional(),
  customWallets: z
    .union([
      z.array(updateHookCustomWalletObjectSchema),
      z.array(evmAddressSchema),
    ])
    .optional(),
  customWalletBps: z.array(z.number().int().min(0).max(10_000)).optional(),
  mevProtectionEnabled: z.boolean().optional(),
  isAntiSandwich: z.boolean().optional(),
  cooldownProtection: z
    .object({
      enabled: z.boolean().optional(),
      cooldownDuration: z.enum(CooldownDurationType).optional(),
      penaltyFee: z.enum(PenaltyFeeType).optional(),
    })
    .optional(),
});

/** Wire form for RWA after stock→address resolution (addresses only). */
const updateHookRwaApiSchema = z.object({
  basketMode: rwaBasketModeSchema,
  rewardAssets: z
    .array(
      z.object({
        address: evmAddressSchema,
        weightBps: z.number().int().min(0).max(10_000).optional(),
      }),
    )
    .min(1),
  customWalletRewards: z
    .record(
      z.string(),
      z.object({
        basketMode: rwaBasketModeSchema,
        assets: z
          .array(
            z.object({
              address: evmAddressSchema,
              weightBps: z.number().int().min(0).max(10_000).optional(),
            }),
          )
          .min(1),
      }),
    )
    .optional(),
});

/**
 * API-WIRE schema for based.bid `POST /api/update-hook` body under `data`.
 * Built by `updateEvmHook` from `updateEvmHookSdkSchema` (stock tickers resolved).
 */
export const updateEvmHookApiSchema = z
  .object({
    tokenAddress: evmAddressSchema,
    chainId: evmChainIdSchema.optional(),
    chain: z.string().min(1).optional(),
    fees: z
      .object({
        v4: updateHookFeesV4ApiSchema.optional(),
      })
      .optional(),
    rwa: updateHookRwaApiSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.chainId === undefined && !data.chain) {
      ctx.addIssue({
        code: 'custom',
        message: 'chainId or chain is required',
        path: ['chainId'],
      });
    }
    if (!data.fees?.v4 && !data.rwa) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide at least one of fees.v4 or rwa',
        path: ['fees'],
      });
    }
  });

export type UpdateEvmHookApi = z.infer<typeof updateEvmHookApiSchema>;
