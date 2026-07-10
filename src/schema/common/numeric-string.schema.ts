import z from 'zod';

/**
 * A non-negative decimal number encoded as a string (e.g. "1000000000.5"), used wherever a
 * value could exceed safe JS integer precision (token amounts, on-chain balances) or where
 * an API expects numeric strings instead of JSON numbers. Pass `min`/`max` to additionally
 * bound the parsed value, e.g. `numberStringSchema(0, 100)` for a 0-100 percentage.
 */
export const numberStringSchema = (min?: number, max?: number) =>
  z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Must be a valid number string')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return (
          !isNaN(num) &&
          (min === undefined || num >= min) &&
          (max === undefined || num <= max)
        );
      },
      { message: `Must be between ${min} and ${max}` },
    )
    .describe(
      `Numeric value as a string${min !== undefined || max !== undefined ? ` (between ${min ?? '-∞'} and ${max ?? '∞'})` : ''}`,
    );
