import { SolanaFlashDexType } from '@enums';
import {
  metadataInputSchema,
  numberStringSchema,
  solanaChainIdSchema,
  solanaFeeBuilderSdkSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createFlashTokenSolana`. Caller/agent-facing input for a
 * two-transaction Flash Token launch (see `./api.ts` - `createSolanaFlashTx1ApiSchema`
 * and `createSolanaFlashTx2ApiSchema` - for the two backend payloads built from this
 * input across TX1/TX2). Exactly one of `raydium`/`meteora` must be set, matching
 * `flashDex`.
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
    // Fee distribution config - shared Fee Builder schema (see
    // schema/common/solana-fee-builder.schema.ts). Percents are 2-dp floats and the
    // six buckets must sum to <= 50 (on-chain MAX_FEE_DISTRIBUTION_PER cap);
    // marketingWalletAddress/rewardToken are required whenever their percent is > 0.
    fees: solanaFeeBuilderSdkSchema
      .optional()
      .describe(
        'Fee distribution config; omit to launch without automatic fee splitting',
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
  );

export type CreateSolanaFlashInput = z.infer<
  typeof createSolanaFlashInputSchema
>;
