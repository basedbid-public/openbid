import z from 'zod';

export const metadataUrlSchema = z
  .string()
  .regex(
    /^https:\/\/ipfs\.based\.bid\/ipfs\/.+/,
    'Metadata URL must be a valid ipfs.based.bid URL',
  );
