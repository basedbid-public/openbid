import { z } from 'zod';

export const v4BuyLimitsSchema = z.discriminatedUnion('isHookWhitelist', [
  z.object({
    protectPeriod: z.number().min(0).max(3600),
    maxBuyPerOrigin: z.number().min(0).max(10),
    isHookWhitelist: z.literal(false),
  }),
  z
    .object({
      protectPeriod: z.number().min(0).max(3600),
      maxBuyPerOrigin: z.number().min(0).max(10),
      isHookWhitelist: z.literal(true),
      maxBuyForWhitelisted: z.number(),
    })
    .refine((data) => data.maxBuyForWhitelisted >= data.maxBuyPerOrigin, {
      message:
        'maxBuyForWhitelisted must be greater than or equal to maxBuyPerOrigin',
      path: ['maxBuyForWhitelisted'],
    }),
]);

export type V4BuyLimitsInput = z.infer<typeof v4BuyLimitsSchema>;
