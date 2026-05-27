import z from 'zod';

export const metadataInputSchema = z.object({
  logo: z.string(),
  twitter: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^https:\/\/x\.com\/[a-zA-Z0-9_]+$/, 'Invalid Twitter/X URL'),
    ])
    .optional()
    .default(''),
  telegram: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/, 'Invalid Telegram URL'),
    ])
    .optional()
    .default(''),
  website: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(
          /^https:\/\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
          'Invalid website URL',
        ),
    ])
    .optional()
    .default(''),
  discord: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^https:\/\/discord\.gg\/[a-zA-Z0-9_]+$/, 'Invalid Discord URL'),
    ])
    .optional()
    .default(''),
  description: z
    .string()
    .max(789, 'Description must be less than 789 characters'),
});
