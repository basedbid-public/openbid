import { z } from 'zod';

/** A base58-encoded Solana wallet/mint/program address (32-44 chars, no 0/O/I/l). */
export const solanaAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address')
  .describe('Solana address (base58, 32-44 chars)');
