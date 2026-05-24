import z from 'zod';

export const slippageSchema = z
  .union([z.literal(1), z.literal(5), z.literal(10)])
  .default(1);
