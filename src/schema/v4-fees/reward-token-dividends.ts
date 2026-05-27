import { z } from 'zod';

export const rewardTokenDividendsSchema = z.union([
  z.literal(0.01),
  z.literal(0.1),
  z.literal(1),
  z.literal(5),
]);
