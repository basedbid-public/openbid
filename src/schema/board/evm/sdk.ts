import { boardFeeSchema, evmChainIdSchema } from 'schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createBoard`. There is no separate API-wire schema for this
 * operation (unlike flash-token/lbp/buy/sell) - `createBoard` posts a payload built
 * directly from this validated input plus the derived `account` (from `PRIVATE_KEY`)
 * and uploaded IPFS URLs for `logo`/`banner`.
 */
export const createEvmBoardSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe(
      'Accepted for API parity with Solana but has no effect on EVM - boards always create on mainnet',
    ),
  chainId: evmChainIdSchema,
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title too long')
    .describe(
      'Board name/title, shown publicly and used as the board identifier',
    ),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long')
    .describe('Public description shown on the board page'),
  logo: z
    .string()
    .min(1, 'Logo file path is required')
    .describe('Local file path to the board logo image (square, max 1MB)'),
  banner: z
    .string()
    .min(1, 'Banner file path is required')
    .describe('Local file path to the board banner image (wide, max 1MB)'),
  fees: z
    .array(boardFeeSchema)
    .optional()
    .describe(
      'Custom fee schedule per launch package tier; omit to use platform defaults',
    ),
});

export type CreateEvmBoardSdk = z.infer<typeof createEvmBoardSchema>;
