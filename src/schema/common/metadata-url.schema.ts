import z from 'zod';

/**
 * URL of a token/board metadata JSON blob after it has been uploaded via
 * `IpfsUpload.uploadMetadata()`. This is an *output* value produced by the SDK
 * (e.g. gempad / IPFS CDN), not something callers construct by hand.
 */
export const metadataUrlSchema = z
  .url('Metadata URL must be a valid URL')
  .describe('URL of uploaded metadata JSON');
