import {
  boardFeePerLaunchPackageSchema,
  boardProfileSchema,
  flashLaunchFeePerSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createBoardSolana`. Caller/agent-facing input - local file paths
 * for `logo`/`banner`, no `signer`/`seed` (those are derived internally). See `./api.ts`
 * for the backend payload shape, which replaces `logo`/`banner` with an uploaded
 * `metaData` URL and adds `signer`/`seed`.
 *
 * Fee model:
 * - `flashLaunchFeePer` (top-level) — board share of DEX volume fees from flash tokens
 *   launched under this board.
 * - `fees` — per launch-package schedule for listing / buy / sell / finalize /
 *   after-launch cuts (mainly LBP-oriented).
 *
 * Profile / access (also written into IPFS board metadata):
 * - socials, `privacyMode`, `isPublicBoard`, `allowRequests`, etc.
 *   Board identity uses `title`.
 */
export const createSolanaBoardSdkSchema = z.object({
  isSandboxMode: z
    .boolean()
    .default(false)
    .describe(
      'Route through testnet.based.bid (true) instead of mainnet (false)',
    ),
  chainId: solanaChainIdSchema,
  title: z
    .string()
    .min(1, 'Title is required')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 32,
      'Board name must be at most 32 bytes',
    )
    .describe(
      'Board name/title, shown publicly and used as the board identifier (max 32 UTF-8 bytes)',
    ),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long')
    .describe('Public description shown on the board page'),
  logo: z
    .string()
    .min(1, 'Logo file path is required')
    .describe('Local file path to the board logo image'),
  banner: z
    .string()
    .min(1, 'Banner file path is required')
    .describe('Local file path to the board banner image'),
  flashLaunchFeePer: flashLaunchFeePerSchema,
  fees: boardFeePerLaunchPackageSchema,
  ...boardProfileSchema.shape,
});

export type CreateSolanaBoardSdk = z.infer<typeof createSolanaBoardSdkSchema>;
