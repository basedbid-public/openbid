import { DEFAULT_BOARD_FEES } from 'constants/default-board-fees';
import { z } from 'zod';
import { numberStringSchema } from '../common/numeric-string.schema';

const boardFeeSolanaSchema = z.object({
  listingFee: numberStringSchema(0, 10),
  listingReferralFee: numberStringSchema(0, 10),
  buyFeePer: numberStringSchema(0, 100),
  sellFeePer: numberStringSchema(0, 100),
  finalizeFeePer: numberStringSchema(0, 100),
  flashLaunchFeePer: numberStringSchema(0, 10),
  tradingFeeAfterLaunchPer: numberStringSchema(0, 100),
});

export const createBoardSolanaSdkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long'),
  logo: z.string().min(1, 'Logo file path is required'),
  banner: z.string().min(1, 'Banner file path is required'),
  fees: z.array(boardFeeSolanaSchema).default(DEFAULT_BOARD_FEES),
  flashLaunchFeePer: numberStringSchema(0, 100),
});
