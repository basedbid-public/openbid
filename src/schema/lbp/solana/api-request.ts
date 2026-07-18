import {
  SOLANA_BASE_TOKEN_PAIR,
  SOLANA_DECIMALS,
  SOLANA_ZERO_ADDRESS,
} from '@constants';
import { SolanaDexType } from '@enums';
import {
  numberStringSchema,
  saleTimeSchema,
  solanaDexFeeTierSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * API-WIRE schema for the based.bid Solana create-LBP endpoint payload. Built internally
 * by `createLbpSolana` from validated `createSolanaLbpInputSchema` (./sdk-input.ts)
 * input - nests most fields under `data`, swaps `LaunchPackageType` for a numeric
 * `package` index, and replaces the sdk's local `metadata.logo` with an uploaded
 * `metadataUrl`.
 */
export const createLbpSolanaApiPayloadSchema = z.object({
  chainId: z.number().int().min(0),
  signer: z.string(),
  data: z.object({
    seed: z.string(),
    advanced: z.literal(true),
    package: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    token: z.object({
      name: z.string().min(1).max(100),
      symbol: z.string().min(1).max(100),
      metadataUrl: z
        .string()
        .regex(
          /^https:\/\/ipfs.based.bid\/ipfs\/.+/,
          'Metadata must be a valid ipfs.based.bid URL',
        ),
      decimals: z.literal(SOLANA_DECIMALS),
      totalSupply: numberStringSchema(),
      initialBuyAmount: numberStringSchema(),
      initialBuySupplyPercent: numberStringSchema(),
      raiseTokenDecimals: z.literal(SOLANA_DECIMALS),
    }),
    sale: z
      .object({
        marketCap: numberStringSchema(0.1, 10_000_000),
        softCap: numberStringSchema(1, 100).optional(),
        endTime: saleTimeSchema().optional(),
        baseTokenForPair: z
          .literal(SOLANA_BASE_TOKEN_PAIR)
          .default(SOLANA_BASE_TOKEN_PAIR),
        baseTokenDecimals: z.literal(SOLANA_DECIMALS).default(SOLANA_DECIMALS),
        maxAllocationPerUser: numberStringSchema(0, 10).default('0'),
        referrer: z
          .string()
          .default(SOLANA_ZERO_ADDRESS)
          .default(SOLANA_ZERO_ADDRESS),
      })
      .refine(
        (data) => {
          const hasSoftCap = data.softCap !== undefined;
          const hasEndTime = data.endTime !== undefined;
          return hasSoftCap === hasEndTime;
        },
        {
          message:
            'endTime is required when softCap is defined, and vice versa',
        },
      ),
    dex: z
      .object({
        routerId: z.enum(SolanaDexType),
        raydiumFeeTierIndex: solanaDexFeeTierSchema.optional(),
        meteoraFeeTierIndex: solanaDexFeeTierSchema.optional(),
      })
      .refine(
        (data) => {
          return data.routerId === SolanaDexType.RAYDIUM
            ? data.raydiumFeeTierIndex !== undefined
            : data.meteoraFeeTierIndex !== undefined;
        },
        {
          message:
            'raydiumFeeTierIndex is required when routerId is RAYDIUM, and meteoraFeeTierIndex is required when routerId is METEORA',
        },
      ),
    baseTokenAddress: z.literal(SOLANA_BASE_TOKEN_PAIR),
    baseTokenDecimals: z.literal(SOLANA_DECIMALS),
  }),
  fees: z
    .object({
      buyPoolCreator: z.number().min(0).max(0.01),
      sellPoolCreator: z.number().min(0).max(0.01),
      buyReferral: z.number().min(0).max(0.01),
      graduation: z.number().min(0).max(0.025),
      feeDistribution: z.boolean(),
      dynamicFee: z.boolean(),
    })
    .optional(),
});

export type CreateLbpSolanaApiPayload = z.infer<
  typeof createLbpSolanaApiPayloadSchema
>;
