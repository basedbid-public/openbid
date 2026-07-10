import z from 'zod';

/**
 * 0 = 1% fees
 * 1 = 2% fees
 * 2 = 4% fees
 * 3 = 6% fees
 */
export const solanaDexFeeTierSchema = z
  .enum(['0', '1', '2', '3'])
  .describe('DEX fee tier index: "0"=1%, "1"=2%, "2"=4%, "3"=6% fees');
