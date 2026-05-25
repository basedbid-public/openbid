import { SOLANA_DECIMALS, SOLANA_ZERO_ADDRESS } from 'constants/solana';
import { LaunchPackageType, SolanaDexType } from 'enums';
import {
  metadataInputSchema,
  numberStringSchema,
  saleTimeSchema,
  solanaAddressSchema,
  solanaDexFeeTierSchema,
} from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const createSolanaLbpInputSchema = z
  .object({
    isSandboxMode: z.boolean().default(false),
    chainId: solanaChainIdSchema,
    package: z.union([
      z.literal(LaunchPackageType.BASED),
      z.literal(LaunchPackageType.SUPER_BASED),
      z.literal(LaunchPackageType.ULTRA_BASED),
    ]),
    board: z.string().optional(),
    boardOwner: solanaAddressSchema.optional(),
    token: z.object({
      name: z.string().max(100, 'Token name must be less than 100 characters'),
      symbol: z
        .string()
        .max(100, 'Token symbol must be less than 100 characters'),
      totalSupply: z.string(),
      decimals: z.literal(SOLANA_DECIMALS).default(SOLANA_DECIMALS).optional(),
      initialBuyAmount: numberStringSchema(),
      metadata: metadataInputSchema,
    }),
    sale: z
      .object({
        marketCap: numberStringSchema(0.1, 10_000_000)
          .optional()
          .default('9000'),
        startTime: saleTimeSchema(),
        maxAllocationPerUser: numberStringSchema(0, 10).optional().default('0'),
        softCap: numberStringSchema(1, 100).optional(),
        endTime: saleTimeSchema(),
        referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS).optional(),
        whitelistedAddresses: z.array(solanaAddressSchema).default([]),
      })
      .default({
        whitelistedAddresses: [],
        marketCap: '9000',
        maxAllocationPerUser: '0',
      })
      .refine(
        (data) => {
          const hasSoftCap = data?.softCap !== undefined;
          const hasEndTime = data?.endTime !== undefined;
          return hasSoftCap === hasEndTime;
        },
        {
          message:
            'endTime is required when softCap is defined, and vice versa',
        },
      )
      .optional(),
    dex: z.object({
      version: z.enum(SolanaDexType),
      feeTier: solanaDexFeeTierSchema,
    }),
    fees: z
      .object({
        buyPoolCreator: z.number().min(0).max(0.01).default(0),
        sellPoolCreator: z.number().min(0).max(0.01).default(0),
        buyReferral: z.number().min(0).max(0.01).default(0),
        graduation: z.number().min(0).max(0.025).default(0),
        feeDistribution: z.boolean(),
        dynamicFee: z.boolean().default(false),
        liquidityPercent: z.number().min(0).max(50),
        buybackPercent: z.number().min(0).max(50),
        rewardPercent: z.number().min(0).max(50),
        marketingPercent: z.number().min(0).max(50),
        creatorPercent: z.number().min(0).max(50),
        marketingWalletAddress: solanaAddressSchema.optional(),
        customFees: z.array(
          z.object({
            percent: z.number().min(0).max(50),
            walletAddress: solanaAddressSchema,
            name: z.string(),
          }),
        ),
        collectQuoteThreshold: z.string(),
        collectBaseThreshold: z.string(),
        feeDistributionPayoutKind: z.literal('SOL').default('SOL'),
        feeDistributionPayoutCustomMint: z.string().optional(),
        rewardToken: solanaAddressSchema.optional(),
        minTokenBalanceForDividends: z.string(),
      })
      .optional()
      .refine(
        (data) => {
          if (!data) {
            return true;
          }

          if (data.marketingPercent > 0 && !data.marketingWalletAddress) {
            return false;
          }
          return true;
        },
        {
          message:
            'marketingWalletAddress is required when marketingPercent is greater than 0',
        },
      )
      .refine(
        (data) => {
          if (!data) {
            return true;
          }

          if (data.rewardPercent > 0 && !data.rewardToken) {
            return false;
          }
          return true;
        },
        {
          message:
            'rewardToken is required when rewardPercent is greater than 0',
        },
      )
      .refine(
        (data) => {
          if (!data) {
            return true;
          }

          const customFeesTotal = data.customFees.reduce(
            (sum, fee) => sum + fee.percent,
            0,
          );
          const total =
            data.liquidityPercent +
            data.buybackPercent +
            data.rewardPercent +
            data.marketingPercent +
            data.creatorPercent +
            customFeesTotal;
          return total === 50;
        },
        {
          message:
            'liquidityPercent + buybackPercent + rewardPercent + marketingPercent + creatorPercent + customFees percentages must equal 50',
        },
      ),
  })
  .refine(
    (data) => {
      if (data.board && !data.boardOwner) {
        return false;
      }
      if (!data.board && data.boardOwner) {
        return false;
      }

      return data.board === undefined && data.boardOwner === undefined;
    },
    {
      message:
        'board and boardOwner must both be defined if one of them is defined',
    },
  );

export type CreateSolanaLbpInput = z.infer<typeof createSolanaLbpInputSchema>;
