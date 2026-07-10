import z from 'zod';

/** A checksummed or lowercase EVM wallet/contract address, e.g. "0xabc...123" (42 hex chars incl. "0x" prefix). */
export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address')
  .describe('EVM wallet or contract address (0x-prefixed, 40 hex chars)');
