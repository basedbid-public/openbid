import {
  boardFeePerLaunchPackageSchema,
  numberStringSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * SDK-INPUT schema for `createBoardSolana`. Caller/agent-facing input - local file paths
 * for `logo`/`banner`, no `signer`/`seed` (those are derived internally). See `./api.ts`
 * for the backend payload shape, which replaces `logo`/`banner` with an uploaded
 * `metaData` URL and adds `signer`/`seed`.
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
    .describe('Local file path to the board logo image'),
  banner: z
    .string()
    .min(1, 'Banner file path is required')
    .describe('Local file path to the board banner image'),
  fees: boardFeePerLaunchPackageSchema,
  flashLaunchFeePer: numberStringSchema().describe(
    'Fee (%) the board takes on Flash Token launches, as a numeric string',
  ),
});

export type CreateSolanaBoardSdk = z.infer<typeof createSolanaBoardSdkSchema>;
