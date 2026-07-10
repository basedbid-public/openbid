import { solanaAddressSchema } from 'schema/common';
import { z } from 'zod';

/**
 * API-WIRE schema for the based.bid Solana fee-distribution configuration payload, sent
 * as part of `createLbpSolana` and `createFlashTokenSolana` to set up how trading fees
 * get split (liquidity/buyback/reward/marketing/creator/custom) for the new pool. Shares
 * the same field set as the `fees` objects in `createSolanaLbpInputSchema` /
 * `createSolanaFlashInputSchema`, but as a standalone schema reused by both launch flows.
 */
export const solanaCustomFeeSchema = z.object({
  percent: z.number().min(0).max(100),
  walletAddress: solanaAddressSchema,
  name: z.string().min(1).max(100),
});

export const solanaFeeDistributionApiPayloadSchema = z.object({
  chainId: z.number().int().min(0),
  address: z.string().min(1),
  feeDistribution: z.boolean(),
  dynamicFee: z.boolean(),
  liquidityPercent: z.number().int().min(0).max(100),
  buybackPercent: z.number().int().min(0).max(100),
  rewardPercent: z.number().int().min(0).max(100),
  marketingPercent: z.number().int().min(0).max(100),
  creatorPercent: z.number().int().min(0).max(100),
  customFeePercent: z.number().int().min(0).max(100),
  marketingWalletAddress: z
    .union([solanaAddressSchema, z.literal('')])
    .optional(),
  customFees: z.array(solanaCustomFeeSchema),
  collectQuoteThreshold: z.string(),
  collectBaseThreshold: z.string(),
  feeDistributionPayoutKind: z.enum(['SOL', 'TOKEN']),
  feeDistributionPayoutCustomMint: z.union([
    solanaAddressSchema,
    z.literal(''),
  ]),
  rewardToken: z.string(),
  minTokenBalanceForDividends: z.string(),
});

export type SolanaFeeDistributionApiPayload = z.infer<
  typeof solanaFeeDistributionApiPayloadSchema
>;
export type SolanaCustomFee = z.infer<typeof solanaCustomFeeSchema>;
