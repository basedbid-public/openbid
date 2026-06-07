import { SolanaFlashDexType } from 'enums';
import {
  metadataInputSchema,
  numberStringSchema,
  solanaAddressSchema,
} from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const createSolanaFlashInputSchema = z
  .object({
    isSandboxMode: z.boolean().default(false),
    chainId: solanaChainIdSchema,
    flashDex: z.union([
      z.literal(SolanaFlashDexType.RAYDIUM),
      z.literal(SolanaFlashDexType.METEORA),
    ]),
    board: z.string().optional(),
    boardOwner: solanaAddressSchema.optional(),
    token: z.object({
      name: z.string().max(100, 'Token name must be less than 100 characters'),
      symbol: z
        .string()
        .max(100, 'Token symbol must be less than 100 characters'),
      totalSupply: z.string(),
      metadata: metadataInputSchema,
      initialBuySupplyPercent: numberStringSchema(),
    }),
    raydium: z
      .object({
        feeTierIndex: z.string(),
        finalStartPrice: z.number().positive(),
      })
      .optional(),
    meteora: z
      .object({
        virtualUsd: z.number().positive(),
        nativeSolPriceUsd: z.number().positive(),
        feeTierIndex: z.string(),
        hasHookDynamicFee: z.boolean(),
        boardSeed: z.string().optional(),
        finalStartPrice: z.number().positive(),
      })
      .optional(),
    fees: z
      .object({
        feeDistribution: z.boolean(),
        dynamicFee: z.boolean().default(false),
        liquidityPercent: z.number().min(0).max(50),
        buybackPercent: z.number().min(0).max(50),
        rewardPercent: z.number().min(0).max(50),
        marketingPercent: z.number().min(0).max(50),
        creatorPercent: z.number().min(0).max(50),
        customFeePercent: z.number().min(0).max(50),
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
        feeDistributionPayoutCustomMint: z.string().default(''),
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
      ),
  })
  .refine(
    (data) => {
      if (data.flashDex === SolanaFlashDexType.RAYDIUM) {
        return data.raydium !== undefined;
      }
      return data.meteora !== undefined;
    },
    {
      message:
        'Raydium or Meteora parameters must be provided based on chosen DEX',
    },
  )
  .refine(
    (data) => {
      if (data.board && data.board.length > 0 && !data.boardOwner) {
        return false;
      }
      if (!data.board && data.boardOwner && data.boardOwner.length > 0) {
        return false;
      }

      return data.board === undefined && data.boardOwner === undefined;
    },
    {
      message:
        'board and boardOwner must both be defined if one of them is defined',
    },
  );

export type CreateSolanaFlashInput = z.infer<
  typeof createSolanaFlashInputSchema
>;
