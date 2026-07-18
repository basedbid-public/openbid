import {
  boardFeePerLaunchPackageSchema,
  metadataUrlSchema,
  numberStringSchema,
  solanaChainIdSchema,
} from '@schema/common';
import { z } from 'zod';

/**
 * API-WIRE schema for the based.bid Solana create-board endpoint payload. Built
 * internally by `createBoardSolana` from validated `createSolanaBoardSdkSchema`
 * (./sdk.ts) input plus the derived `signer` (wallet), generated `seed`, and uploaded
 * `metaData` URL (in place of the sdk's local `logo`/`banner`/description fields).
 */
export const createSolanaBoardApiSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: z
    .string()
    .describe('Board owner wallet address, derived from SOLANA_PRIVATE_KEY'),
  seed: z
    .string()
    .describe('Randomly generated seed used to derive the board PDA'),
  metaData: metadataUrlSchema,
  fees: boardFeePerLaunchPackageSchema,
  flashLaunchFeePer: numberStringSchema(),
  isSandboxMode: z.boolean().default(false),
});
