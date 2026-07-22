import { SOLANA_DECIMALS, SOLANA_ZERO_ADDRESS } from '@constants';
import { LaunchPackageType, SolanaDexType } from '@enums';
import {
  metadataInputSchema,
  numberStringSchema,
  saleTimeSchema,
  solanaAddressSchema,
  solanaChainIdSchema,
  solanaDexFeeTierSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createLbpSolana`. Caller/agent-facing input - `metadata.logo` is
 * a local file path (uploaded to IPFS internally), and `board`/`boardOwner` must both be
 * set or both omitted. See `./api-request.ts` (`createLbpSolanaApiPayloadSchema`) for the
 * backend payload built from this input, which nests fields under `data` and swaps
 * `LaunchPackageType` for a numeric package index.
 */
export const createSolanaLbpInputSchema = z
  .object({
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
          'user explicitly names a custom board. Must be set together with boardOwner (both or neither).',
      ),
    boardOwner: solanaAddressSchema
      .optional()
      .describe(
        'Wallet address of the custom board owner; required if board is set',
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
      totalSupply: z
        .string()
        .describe('Total token supply as a numeric string'),
      decimals: z
        .literal(SOLANA_DECIMALS)
        .default(SOLANA_DECIMALS)
        .optional()
        .describe(
          `Token decimals; must be ${SOLANA_DECIMALS} (Solana standard)`,
        ),
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
          .describe(
            'Starting market cap for the token, in USD (default 9,000)',
          ),
        startTime: saleTimeSchema(),
        maxAllocationPerUser: numberStringSchema(0, 10)
          .optional()
          .default('0')
          .describe(
            'Max % of supply any single wallet can buy during the sale',
          ),
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
          message:
            'endTime is required when softCap is defined, and vice versa',
        },
      )
      .optional(),
    dex: z.object({
      version: z
        .enum(SolanaDexType)
        .describe('DEX to launch on: Raydium or Meteora'),
      feeTier: solanaDexFeeTierSchema,
    }),
    // Pool trading fees + fee distribution config. Mirrors the shape used for Solana
    // Flash Tokens (schema/flash-token/solana/sdk.ts) - see that file for the fully
    // documented version of the feeDistribution/*Percent/customFees fields.
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
          .describe(
            'Fee (%) taken when the sale finalizes/graduates, max 2.5%',
          ),
        feeDistribution: z
          .boolean()
          .describe(
            'Enable automatic fee distribution across liquidity/buyback/reward/marketing/creator/custom splits',
          ),
        dynamicFee: z
          .boolean()
          .default(false)
          .describe('Enable fees that scale with recent price volatility'),
        liquidityPercent: z
          .number()
          .min(0)
          .max(50)
          .describe('% of collected fees routed to strengthening liquidity'),
        buybackPercent: z
          .number()
          .min(0)
          .max(50)
          .describe('% of collected fees routed to token buybacks'),
        rewardPercent: z
          .number()
          .min(0)
          .max(50)
          .describe(
            '% of collected fees routed to holder reward payouts (requires rewardToken)',
          ),
        marketingPercent: z
          .number()
          .min(0)
          .max(50)
          .describe(
            '% of collected fees routed to the marketing wallet (requires marketingWalletAddress)',
          ),
        creatorPercent: z
          .number()
          .min(0)
          .max(50)
          .describe('% of collected fees routed to the token creator'),
        marketingWalletAddress: solanaAddressSchema
          .optional()
          .describe(
            'Wallet to receive marketing fees; required when marketingPercent > 0',
          ),
        customFees: z
          .array(
            z.object({
              percent: z
                .number()
                .min(0)
                .max(50)
                .describe('% of collected fees routed to this wallet'),
              walletAddress: solanaAddressSchema.describe(
                'Wallet to receive this fee cut',
              ),
              name: z
                .string()
                .describe(
                  'Label for this payout, e.g. "marketing" or a KOL name',
                ),
            }),
          )
          .describe('Extra fixed fee splits to arbitrary wallets'),
        collectQuoteThreshold: z
          .string()
          .describe(
            'Accumulated SOL balance that triggers a fee distribution payout, as a numeric string',
          ),
        collectBaseThreshold: z
          .string()
          .describe(
            'Accumulated base-token balance that triggers a fee distribution payout, as a numeric string',
          ),
        feeDistributionPayoutKind: z
          .literal('SOL')
          .default('SOL')
          .describe(
            'Currency fee payouts are made in; currently only "SOL" is supported',
          ),
        feeDistributionPayoutCustomMint: z
          .string()
          .optional()
          .describe('Reserved for a future custom payout mint'),
        rewardToken: solanaAddressSchema
          .optional()
          .describe(
            'Token mint holder rewards are paid in; required when rewardPercent > 0',
          ),
        minTokenBalanceForDividends: z
          .string()
          .describe(
            'Minimum token balance a holder needs to qualify for reward payouts, as a numeric string',
          ),
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
      if (data.board && !data.boardOwner) {
        return false;
      }
      if (!data.board && data.boardOwner) {
        return false;
      }

      return data.board !== undefined && data.boardOwner !== undefined;
    },
    {
      message:
        'board and boardOwner must both be defined if one of them is defined',
    },
  );

export type CreateSolanaLbpInput = z.infer<typeof createSolanaLbpInputSchema>;
