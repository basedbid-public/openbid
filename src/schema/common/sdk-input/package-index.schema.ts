import z from 'zod';

export const packageIndexSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);
