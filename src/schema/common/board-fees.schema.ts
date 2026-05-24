import { DEFAULT_BOARD_FEES } from 'constants/default-board-fees';
import z from 'zod';
import { numberStringSchema } from './numeric-string.schema';
export const boardFeeSchema = z.object({
  listingFee: numberStringSchema(0, 10),
  listingReferralFee: numberStringSchema(0, 10),
  buyFeePer: numberStringSchema(0, 100),
  sellFeePer: numberStringSchema(0, 100),
  finalizeFeePer: numberStringSchema(0, 100),
  flashLaunchFeePer: numberStringSchema(0, 10),
  tradingFeeAfterLaunchPer: numberStringSchema(0, 100),
});

export const boardFeePerLaunchPackageSchema = z
  .array(boardFeeSchema)
  .length(3)
  .optional()
  .default(DEFAULT_BOARD_FEES);
