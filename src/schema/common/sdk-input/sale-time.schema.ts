import z from 'zod';

/**
 * LBP sale start time as a Unix timestamp (seconds). Must be in the future at the moment
 * validation runs - re-evaluated each call since it's a function, not a static schema.
 * Optional: omit to use the platform's default start behavior (immediate/next block).
 */
export const saleTimeSchema = () =>
  z
    .number()
    .int()
    .min(Math.floor(Date.now() / 1000))
    .refine(
      (val) => val >= Math.floor(Date.now() / 1000),
      'Start time must be in the future',
    )
    .optional()
    .describe(
      'Sale start time as a future Unix timestamp in seconds (optional)',
    );
