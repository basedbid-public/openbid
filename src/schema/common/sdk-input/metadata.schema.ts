import z from 'zod';

export const metadataInputSchema = z.object({
  logo: z.string(),
  twitter: z
    .string()
    .regex(/^https:\/\/x\.com\/[a-zA-Z0-9_]+$/, 'Invalid Twitter/X URL')
    .optional(),
  telegram: z
    .string()
    .regex(/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/, 'Invalid Telegram URL')
    .optional(),
  website: z
    .string()
    .regex(/^https:\/\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/, 'Invalid website URL')
    .optional(),
  discord: z
    .string()
    .regex(/^https:\/\/discord\.gg\/[a-zA-Z0-9_]+$/, 'Invalid Discord URL')
    .optional(),
  description: z
    .string()
    .max(789, 'Description must be less than 789 characters'),
});
