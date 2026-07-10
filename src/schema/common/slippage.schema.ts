import z from 'zod';

/**
 * Maximum acceptable slippage for a buy/sell, as a whole percent. Only 1, 5, or 10 are
 * accepted - there is no free-form slippage. Use 1% for stable/low-volatility pairs, 5%
 * as a general default, and 10% for thinly-traded or highly volatile tokens.
 */
export const slippageSchema = z
  .union([z.literal(1), z.literal(5), z.literal(10)])
  .default(1)
  .describe('Max slippage percent: 1, 5, or 10 (default 1)');
