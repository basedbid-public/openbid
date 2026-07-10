import z from 'zod';

/**
 * Token metadata that gets uploaded to IPFS as JSON before launch. `logo` is a local file
 * path (uploaded separately as an image, then referenced here as an IPFS URL by the
 * calling script) - all social fields are optional and default to `''` when not provided,
 * they should NOT be filled with placeholder values unless the user supplies them.
 */
export const metadataInputSchema = z.object({
  logo: z
    .string()
    .describe(
      'Local file path to the token logo image (uploaded to IPFS before launch)',
    ),
  twitter: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^https:\/\/x\.com\/[a-zA-Z0-9_]+$/, 'Invalid Twitter/X URL'),
    ])
    .optional()
    .default('')
    .describe("Twitter/X profile URL (https://x.com/...), or '' if none"),
  telegram: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/, 'Invalid Telegram URL'),
    ])
    .optional()
    .default('')
    .describe("Telegram group URL (https://t.me/...), or '' if none"),
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
    .default('')
    .describe("Project website URL, or '' if none"),
  discord: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^https:\/\/discord\.gg\/[a-zA-Z0-9_]+$/, 'Invalid Discord URL'),
    ])
    .optional()
    .default('')
    .describe("Discord invite URL (https://discord.gg/...), or '' if none"),
  description: z
    .string()
    .max(789, 'Description must be less than 789 characters')
    .describe(
      'Token description shown on the based.bid platform (max 789 chars)',
    ),
});
