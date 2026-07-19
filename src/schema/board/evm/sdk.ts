import {
  boardFeeSchema,
  boardProfileSchema,
  evmChainIdSchema,
  flashLaunchFeePerSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createEvmBoard`. Caller/agent-facing input - local file paths
 * for `logo`/`banner`, no `account` (derived from `PRIVATE_KEY`). See `./api.ts` for
 * the backend payload shape, which replaces local paths with uploaded `logoUrl` /
 * `bannerUrl` / `metaUri` and adds `account`.
 *
 * Fee model:
 * - `flashLaunchFeePer` (top-level) — board share of DEX volume fees from flash tokens
 *   launched under this board.
 * - `fees` (optional array) — per launch-package schedule for listing / buy / sell /
 *   finalize / after-launch cuts (mainly LBP-oriented).
 *
 * Profile / access (also written into IPFS board metadata):
 * - socials, `privacyMode`, `isPublicBoard`, `allowRequests`, etc.
 *   Board identity uses `title`.
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
    .max(48, 'Title must be 48 characters or less')
    .describe(
      'Board name/title, shown publicly and used as the board identifier (max 48 characters)',
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
  flashLaunchFeePer: flashLaunchFeePerSchema,
  fees: z
    .array(boardFeeSchema)
    .optional()
    .describe(
      'Custom fee schedule per launch package tier; omit to use platform defaults. ' +
        'Does not include flash-token volume fees — use top-level `flashLaunchFeePer` for that.',
    ),
  ...boardProfileSchema.shape,
});

export type CreateEvmBoardSdk = z.infer<typeof createEvmBoardSchema>;
