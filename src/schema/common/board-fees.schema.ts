import { DEFAULT_BOARD_FEES } from 'constants/default-board-fees';
import z from 'zod';
import { numberStringSchema } from './numeric-string.schema';

/** Fee percentages a custom board charges tokens/LBPs launching under it. */
export const boardFeeSchema = z.object({
  listingFee: numberStringSchema(0, 10).describe(
    'One-time fee (%) charged to list a token/LBP under this board',
  ),
  listingReferralFee: numberStringSchema(0, 10).describe(
    'Referral cut (%) of the listing fee paid to whoever referred the launch',
  ),
  buyFeePer: numberStringSchema(0, 100).describe(
    'Fee (%) the board takes on each buy transaction',
  ),
  sellFeePer: numberStringSchema(0, 100).describe(
    'Fee (%) the board takes on each sell transaction',
  ),
  finalizeFeePer: numberStringSchema(0, 100).describe(
    'Fee (%) the board takes when an LBP sale finalizes/graduates',
  ),
  flashLaunchFeePer: numberStringSchema(0, 10).describe(
    'Fee (%) the board takes on Flash Token launches specifically',
  ),
  tradingFeeAfterLaunchPer: numberStringSchema(0, 100).describe(
    'Fee (%) the board takes on ongoing trades after launch/graduation',
  ),
});

/**
 * Per-launch-package fee schedule for a board: exactly 3 entries, indexed to match
 * `LaunchPackageType` (0 = BASED, 1 = SUPER_BASED, 2 = ULTRA_BASED). Defaults to
 * `DEFAULT_BOARD_FEES` when omitted.
 */
export const boardFeePerLaunchPackageSchema = z
  .array(boardFeeSchema)
  .length(3)
  .optional()
  .default(DEFAULT_BOARD_FEES)
  .describe(
    'Fee schedule per launch package tier, array of exactly 3 (BASED, SUPER_BASED, ULTRA_BASED)',
  );
