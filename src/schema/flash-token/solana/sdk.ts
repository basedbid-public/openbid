import { SolanaFlashDexType } from '@enums';
import {
  metadataInputSchema,
  numberStringSchema,
  solanaAddressSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createFlashTokenSolana`. Caller/agent-facing input for a
 * two-transaction Flash Token launch (see `./api.ts` - `createSolanaFlashTx1ApiSchema`
 * and `createSolanaFlashTx2ApiSchema` - for the two backend payloads built from this
 * input across TX1/TX2). Exactly one of `raydium`/`meteora` must be set, matching
 * `flashDex`; `board`/`boardOwner` must both be set or both omitted.
 */
export const createSolanaFlashInputSchema = z
  .object({
    isSandboxMode: z
      .boolean()
      .default(false)
      .describe(
        'Route through testnet.based.bid (true) instead of mainnet (false)',
      ),
    chainId: solanaChainIdSchema,
    flashDex: z
      .union([
        z.literal(SolanaFlashDexType.RAYDIUM),
        z.literal(SolanaFlashDexType.METEORA),
      ])
      .describe(
        'DEX to launch on: selects whether `raydium` or `meteora` config is required',
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
      metadata: metadataInputSchema,
      initialBuySupplyPercent: numberStringSchema().describe(
        '% of total supply reserved for the initial buy, as a numeric string',
      ),
    }),
    raydium: z
      .object({
        feeTierIndex: z.string().describe('Raydium fee tier index'),
        finalStartPrice: z
          .number()
          .positive()
          .describe('Final starting price for the pool'),
      })
      .optional()
      .describe('Required when flashDex is RAYDIUM; ignored otherwise'),
    meteora: z
      .object({
        virtualUsd: z
          .number()
          .positive()
          .describe('Virtual USD value used to seed the bonding curve'),
        nativeSolPriceUsd: z
          .number()
          .positive()
          .describe('Native SOL price in USD at launch time'),
        feeTierIndex: z.string().describe('Meteora fee tier index'),
        hasHookDynamicFee: z
          .boolean()
          .describe('Enable Meteora dynamic fee hook'),
        boardSeed: z
          .string()
          .optional()
          .describe('Board seed string, if launching under a custom board'),
        finalStartPrice: z
          .number()
          .positive()
          .describe('Final starting price for the pool'),
      })
      .optional()
      .describe('Required when flashDex is METEORA; ignored otherwise'),
    // Fee distribution config. All *Percent fields should sum to 100 when feeDistribution
    // is enabled; marketingWalletAddress/rewardToken are conditionally required (see the
    // .refine calls below) whenever their corresponding percent is > 0.
    fees: z
      .object({
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
        customFeePercent: z
          .number()
          .min(0)
          .max(50)
          .describe(
            '% of collected fees routed to custom wallets listed in customFees',
          ),
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
          .describe(
            'Extra fixed fee splits to arbitrary wallets, summing to customFeePercent',
          ),
        collectQuoteThreshold: z
          .string()
          .describe(
            'Accumulated quote-token (SOL) balance that triggers a fee distribution payout, as a numeric string',
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
          .default('')
          .describe(
            'Reserved for a future custom payout mint; leave as the default empty string',
          ),
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
      .describe(
        'Fee distribution config; omit to launch without automatic fee splitting',
      )
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
