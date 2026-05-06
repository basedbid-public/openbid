import { z } from 'zod';

const boardFeeSchema = z.object({
  listingFee: z.bigint().min(0n, 'Listing fee must be non-negative'),
  listingReferralFee: z
    .bigint()
    .min(0n, 'Listing referral fee must be non-negative'),
  buyFeePer: z
    .number()
    .min(0)
    .max(
      10000,
      'Buy fee percentage must be between 0 and 10000 (basis points)',
    ),
  sellFeePer: z
    .number()
    .min(0)
    .max(
      10000,
      'Sell fee percentage must be between 0 and 10000 (basis points)',
    ),
  finalizeFeePer: z
    .number()
    .min(0)
    .max(
      10000,
      'Finalize fee percentage must be between 0 and 10000 (basis points)',
    ),
  flashLaunchFeePer: z
    .number()
    .min(0)
    .max(
      10000,
      'Flash launch fee percentage must be between 0 and 10000 (basis points)',
    ),
  tradingFeeAfterLaunchPer: z
    .number()
    .min(0)
    .max(
      10000,
      'Trading fee after launch percentage must be between 0 and 10000 (basis points)',
    ),
  padding: z.number().min(0).max(255, 'Padding must be between 0 and 255'),
});

export const createBoardSchema = z.object({
  chainId: z.union([z.literal(1), z.literal(56), z.literal(8453)]),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long'),
  logo: z.string().min(1, 'Logo file path is required'),
  banner: z.string().optional(),
  fees: z.array(boardFeeSchema).optional(),
});
