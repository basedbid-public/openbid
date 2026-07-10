import z from 'zod';

/** Supported Solana chain ID: 501 = Solana Mainnet, 5011 = Solana Devnet. */
export const solanaChainIdSchema = z
  .union([z.literal(501), z.literal(5011)])
  .describe('Solana chain ID: 501 (Mainnet) or 5011 (Devnet)');
