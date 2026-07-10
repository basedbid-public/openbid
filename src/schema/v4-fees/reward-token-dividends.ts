import { z } from 'zod';

/** Minimum token balance (in token units) a holder must have to qualify for V4 Fee Builder reward payouts. One of a fixed set of tiers - not a free-form number. */
export const rewardTokenDividendsSchema = z
  .union([z.literal(0.01), z.literal(0.1), z.literal(1), z.literal(5)])
  .describe('Minimum token balance for reward eligibility: 0.01, 0.1, 1, or 5');
