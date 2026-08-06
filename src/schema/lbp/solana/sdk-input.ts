import { SOLANA_DECIMALS, SOLANA_ZERO_ADDRESS } from '@constants';
import { LaunchPackageType, SolanaDexType } from '@enums';
import {
  metadataInputSchema,
  numberStringSchema,
  saleTimeSchema,
  solanaAddressSchema,
  solanaChainIdSchema,
  solanaDexFeeTierSchema,
  solanaFeeBuilderFieldsSchema,
  solanaFeeBuilderRules,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createLbpSolana`. Caller/agent-facing input - `metadata.logo` is
 * a local file path (uploaded to IPFS internally). See `./api-request.ts` (`createLbpSolanaApiPayloadSchema`) for the
 * backend payload built from this input, which nests fields under `data` and swaps
 * `LaunchPackageType` for a numeric package index.
 */
export const createSolanaLbpInputSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe(
      'Route through testnet.based.bid (true) instead of mainnet (false)',
    ),
  chainId: solanaChainIdSchema,
  package: z
    .union([
      z.literal(LaunchPackageType.BASED),
      z.literal(LaunchPackageType.SUPER_BASED),
      z.literal(LaunchPackageType.ULTRA_BASED),
    ])
    .describe(
      'Launch tier: BASED (free), SUPER_BASED (sale alerts), or ULTRA_BASED (sale + buy alerts)',
    ),
  board: z
    .string()
    .optional()
    .describe(
      'Custom board title. Omit entirely for no board affiliation - only set when the ' +
        'user explicitly names a custom board.',
    ),
  token: z.object({
    name: z
      .string()
      .max(100, 'Token name must be less than 100 characters')
      .describe('Token name (max 100 chars)'),
    symbol: z
      .string()
      .max(100, 'Token symbol must be less than 100 characters')
      .describe('Token symbol/ticker (max 100 chars)'),
    totalSupply: z.string().describe('Total token supply as a numeric string'),
    decimals: z
      .literal(SOLANA_DECIMALS)
      .default(SOLANA_DECIMALS)
      .optional()
      .describe(`Token decimals; must be ${SOLANA_DECIMALS} (Solana standard)`),
    initialBuyAmount: numberStringSchema().describe(
      'Amount of SOL the creator spends to buy in at launch',
    ),
    initialBuySupplyPercent: numberStringSchema()
      .default('0')
      .describe(
        '% of total supply reserved for the initial buy, as a numeric string',
      ),
    metadata: metadataInputSchema,
  }),
  sale: z
    .object({
      marketCap: numberStringSchema(0.1, 10_000_000)
        .optional()
        .default('9000')
        .describe('Starting market cap for the token, in USD (default 9,000)'),
      startTime: saleTimeSchema(),
      maxAllocationPerUser: numberStringSchema(0, 10)
        .optional()
        .default('0')
        .describe('Max % of supply any single wallet can buy during the sale'),
      softCap: numberStringSchema(1, 100)
        .optional()
        .describe(
          'Minimum raise amount for the sale to succeed; requires endTime when set',
        ),
      endTime: saleTimeSchema(),
      referrer: solanaAddressSchema
        .default(SOLANA_ZERO_ADDRESS)
        .optional()
        .describe(
          'Wallet to credit referral fees to; defaults to the zero address (no referrer)',
        ),
      whitelistedAddresses: z
        .array(solanaAddressSchema)
        .default([])
        .describe(
          'Wallets allowed early/preferential access during the sale (empty = no whitelist)',
        ),
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
        message: 'endTime is required when softCap is defined, and vice versa',
      },
    )
    .optional(),
  dex: z.object({
    version: z
      .enum(SolanaDexType)
      .describe('DEX to launch on: Raydium or Meteora'),
    feeTier: solanaDexFeeTierSchema,
  }),
  // Pool trading fees + fee distribution config. The fee-distribution part is the
  // shared Fee Builder schema (schema/common/solana-fee-builder.schema.ts, same as
  // Solana Flash Tokens): 2-dp float percents, six buckets summing to <= 50
  // (on-chain MAX_FEE_DISTRIBUTION_PER cap), conditional wallet/mint requirements.
  fees: z
    .object({
      buyPoolCreator: z
        .number()
        .min(0)
        .max(0.01)
        .default(0)
        .describe('Fee (%) to the pool creator on each buy, max 1%'),
      sellPoolCreator: z
        .number()
        .min(0)
        .max(0.01)
        .default(0)
        .describe('Fee (%) to the pool creator on each sell, max 1%'),
      buyReferral: z
        .number()
        .min(0)
        .max(0.01)
        .default(0)
        .describe('Fee (%) allocated to referrers on buys, max 1%'),
      graduation: z
        .number()
        .min(0)
        .max(0.025)
        .default(0)
        .describe('Fee (%) taken when the sale finalizes/graduates, max 2.5%'),
    })
    .extend(solanaFeeBuilderFieldsSchema.shape)
    .superRefine(solanaFeeBuilderRules)
    .optional(),
});

export type CreateSolanaLbpInput = z.infer<typeof createSolanaLbpInputSchema>;
