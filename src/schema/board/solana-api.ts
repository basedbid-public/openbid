import { DEFAULT_BOARD_FEES } from 'constants/default-board-fees';
import { z } from 'zod';
import { numberStringSchema } from '../common/numeric-string.schema';

const boardFeeSolanaApiSchema = z.object({
  listingFee: numberStringSchema(0, 10),
  listingReferralFee: numberStringSchema(0, 10),
  buyFeePer: numberStringSchema(0, 100),
  sellFeePer: numberStringSchema(0, 100),
  finalizeFeePer: numberStringSchema(0, 100),
  flashLaunchFeePer: numberStringSchema(0, 10),
  tradingFeeAfterLaunchPer: numberStringSchema(0, 100),
});

export const createBoardSolanaApiSchema = z.object({
  chainId: z.literal(5011),
  signer: z.string(),
  seed: z.string(),
  metaData: z
    .string()
    .regex(
      /^https:\/\/ipfs\.based\.bid\/ipfs\/.+/,
      'Metadata URL must be a valid ipfs.based.bid URL',
    ),
  fees: z.array(boardFeeSolanaApiSchema).optional().default(DEFAULT_BOARD_FEES),
  flashLaunchFeePer: z.string(),
});
