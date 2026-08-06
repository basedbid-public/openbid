import {
  solanaAddressSchema,
  solanaFeeBuilderFieldsSchema,
  solanaFeeBuilderPercentSchema,
  solanaFeeBuilderRules,
  sumSolanaCustomFeePercent,
  type SolanaCustomFee,
} from '@schema/common';
import { z } from 'zod';

export { solanaCustomFeeSchema } from '@schema/common';
export type { SolanaCustomFee } from '@schema/common';

/**
 * API-WIRE schema for the based.bid Solana fee-distribution configuration payload, sent
 * as part of `createLbpSolana` and `createFlashTokenSolana` to set up how trading fees
 * get split (liquidity/buyback/reward/marketing/creator/custom) for the new pool.
 * Built from the shared `solanaFeeBuilderFieldsSchema` (same fields as the `fees`
 * objects in the two launch input schemas) with wire-specific strictness: fields that
 * are optional on the SDK side are required here, with `''` meaning "not set".
 *
 * NOTE: percents are 2-dp floats capped so the six buckets sum to <= 50 (on-chain
 * `MAX_FEE_DISTRIBUTION_PER`) - the previous `.int().max(100)` version rejected
 * payloads the webapp itself produces.
 */
const solanaFeeDistributionWireFields = solanaFeeBuilderFieldsSchema.extend({
  customFeePercent: solanaFeeBuilderPercentSchema,
  marketingWalletAddress: z
    .union([solanaAddressSchema, z.literal('')])
    .default(''),
  feeDistributionPayoutKind: z.enum(['SOL', 'TOKEN']),
  feeDistributionPayoutCustomMint: z.union([
    solanaAddressSchema,
    z.literal(''),
  ]),
  rewardToken: z.union([solanaAddressSchema, z.literal('')]),
});

/** Wire payload minus chainId/address - validatable BEFORE the mint address exists. */
export const solanaFeeDistributionFieldsSchema =
  solanaFeeDistributionWireFields.superRefine(solanaFeeBuilderRules);

export const solanaFeeDistributionApiPayloadSchema =
  solanaFeeDistributionWireFields
    .extend({
      chainId: z.number().int().min(0),
      address: z.string().min(1),
    })
    .superRefine(solanaFeeBuilderRules);

export type SolanaFeeDistributionFields = z.infer<
  typeof solanaFeeDistributionFieldsSchema
>;
export type SolanaFeeDistributionApiPayload = z.infer<
  typeof solanaFeeDistributionApiPayloadSchema
>;

/**
 * SDK-parsed `fees` shape accepted by {@link buildSolanaFeeDistributionFields}.
 * Matches both launch flows' `fees` objects (the LBP variant carries extra
 * pool-fee fields, which are deliberately not copied to the wire payload).
 */
export interface SolanaFeeDistributionSource {
  feeDistribution: boolean;
  dynamicFee: boolean;
  liquidityPercent: number;
  buybackPercent: number;
  rewardPercent: number;
  marketingPercent: number;
  creatorPercent: number;
  customFeePercent?: number;
  marketingWalletAddress?: string;
  customFees: SolanaCustomFee[];
  collectQuoteThreshold: string;
  collectBaseThreshold: string;
  feeDistributionPayoutKind: 'SOL' | 'TOKEN';
  feeDistributionPayoutCustomMint?: string;
  rewardToken?: string;
  minTokenBalanceForDividends: string;
}

/**
 * Coerce validated SDK `fees` input into the wire fields and validate them.
 * Call this BEFORE any transaction is signed so a bad Fee Builder config fails
 * while the launch still costs nothing; the returned fields only need
 * `chainId`/`address` added once the mint exists and cannot fail again.
 */
export const buildSolanaFeeDistributionFields = (
  fees: SolanaFeeDistributionSource,
): SolanaFeeDistributionFields => {
  const parsed = solanaFeeDistributionFieldsSchema.safeParse({
    feeDistribution: fees.feeDistribution,
    dynamicFee: fees.dynamicFee,
    liquidityPercent: fees.liquidityPercent,
    buybackPercent: fees.buybackPercent,
    rewardPercent: fees.rewardPercent,
    marketingPercent: fees.marketingPercent,
    creatorPercent: fees.creatorPercent,
    customFeePercent:
      fees.customFeePercent ?? sumSolanaCustomFeePercent(fees.customFees),
    marketingWalletAddress: fees.marketingWalletAddress ?? '',
    customFees: fees.customFees,
    collectQuoteThreshold: fees.collectQuoteThreshold,
    collectBaseThreshold: fees.collectBaseThreshold,
    feeDistributionPayoutKind: fees.feeDistributionPayoutKind,
    feeDistributionPayoutCustomMint: fees.feeDistributionPayoutCustomMint ?? '',
    rewardToken: fees.rewardToken ?? '',
    minTokenBalanceForDividends: fees.minTokenBalanceForDividends,
  });

  if (!parsed.success) {
    throw new Error(
      'Invalid fee distribution payload: ' + parsed.error.message,
    );
  }

  return parsed.data;
};
