import z from 'zod';

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
    );
