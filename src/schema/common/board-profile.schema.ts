import z from 'zod';
import { packageIndexSchema } from './sdk-input/package-index.schema';

/**
 * Board visibility / join policy on based.bid.
 * - `public` — anyone can view and launch under the board
 * - `request_to_join` — launches require board-owner approval
 * - `private` — closed board
 * - `limited_visibility` — restricted discovery / access
 */
export const boardPrivacyModeSchema = z
  .enum(['request_to_join', 'public', 'private', 'limited_visibility'])
  .describe(
    'Board privacy mode: request_to_join | public | private | limited_visibility',
  );

const optionalHttpsUrl = (regex: RegExp, message: string, describe: string) =>
  z
    .union([z.literal(''), z.string().regex(regex, message)])
    .optional()
    .default('')
    .describe(describe);

/** Optional board social links — omit or pass '' when unused. */
export const boardSocialsSchema = z.object({
  website: optionalHttpsUrl(
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(\/[^\s]*)?$/,
    'Invalid website URL',
    "Project website URL (https://...), or '' if none",
  ),
  telegram: optionalHttpsUrl(
    /^https:\/\/t\.me\/[a-zA-Z0-9_]+$/,
    'Invalid Telegram URL',
    "Telegram group/channel URL (https://t.me/...), or '' if none",
  ),
  twitter: optionalHttpsUrl(
    /^https:\/\/x\.com\/[a-zA-Z0-9_]+$/,
    'Invalid Twitter/X URL',
    "Twitter/X profile URL (https://x.com/...), or '' if none",
  ),
  gitbook: optionalHttpsUrl(
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(\/[^\s]*)?$/,
    'Invalid GitBook URL',
    "GitBook / docs URL (https://...), or '' if none",
  ),
  tiktok: optionalHttpsUrl(
    /^https:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._]+$/,
    'Invalid TikTok URL',
    "TikTok profile URL (https://www.tiktok.com/@...), or '' if none",
  ),
  youtube: optionalHttpsUrl(
    /^https:\/\/(www\.)?(youtube\.com\/(@[a-zA-Z0-9_-]+|watch\?v=[a-zA-Z0-9_-]+|channel\/[a-zA-Z0-9_-]+)|youtu\.be\/[a-zA-Z0-9_-]+)$/,
    'Invalid YouTube URL',
    "YouTube channel or video URL, or '' if none",
  ),
});

/**
 * Board identity / access fields stored in board metadata (and mirrored on create payloads
 * where the API accepts them). The board is identified by its `title` on the create schema.
 */
export const boardProfileSchema = z.object({
  ...boardSocialsSchema.shape,
  isAllowed: z
    .boolean()
    .default(true)
    .describe(
      'Whether the board is allowed to accept launches on the platform',
    ),
  apiPackageIndex: packageIndexSchema
    .default(0)
    .describe(
      'Default launch package index for this board: 0 (BASED), 1 (SUPER_BASED), 2 (ULTRA_BASED)',
    ),
  privacyMode: boardPrivacyModeSchema.default('public'),
  isPublicBoard: z
    .boolean()
    .default(true)
    .describe('Whether the board is publicly listed / discoverable'),
  allowRequests: z
    .boolean()
    .default(false)
    .describe(
      'Whether users may request to join / launch under this board (typical with request_to_join)',
    ),
});

export type BoardPrivacyMode = z.infer<typeof boardPrivacyModeSchema>;
export type BoardSocials = z.infer<typeof boardSocialsSchema>;
export type BoardProfile = z.infer<typeof boardProfileSchema>;
