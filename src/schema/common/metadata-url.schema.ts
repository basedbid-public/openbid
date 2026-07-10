import z from 'zod';

/**
 * URL of a token/board metadata JSON blob after it has been uploaded to IPFS via
 * `IpfsUpload.uploadMetadata()`. This is an *output* value produced by the SDK, not
 * something callers construct by hand - it always points at `ipfs.based.bid`.
 */
export const metadataUrlSchema = z
  .string()
  .regex(
    /^https:\/\/ipfs\.based\.bid\/ipfs\/.+/,
    'Metadata URL must be a valid ipfs.based.bid URL',
  )
  .describe(
    'IPFS URL of uploaded metadata JSON (https://ipfs.based.bid/ipfs/...)',
  );
