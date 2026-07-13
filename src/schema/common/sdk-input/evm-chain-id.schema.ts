import z from 'zod';

/** Supported EVM chain ID: 1 = Ethereum Mainnet, 56 = BNB Smart Chain, 8453 = Base Mainnet, 4663 = Robinhood Chain. */
export const evmChainIdSchema = z
  .union([z.literal(1), z.literal(56), z.literal(8453), z.literal(4663)])
  .transform((val) => val)
  .describe(
    'EVM chain ID: 1 (Ethereum), 56 (BSC), 8453 (Base), or 4663 (Robinhood Chain)',
  );
