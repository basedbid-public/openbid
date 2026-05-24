import z from 'zod';

export const saleTimeSchema = () =>
  z
    .number()
    .int()
    .min(Math.floor(Date.now() / 1000))
    .refine(
      (val) => val >= Math.floor(Date.now() / 1000),
      'Start time must be in the future',
    )
    .optional();
