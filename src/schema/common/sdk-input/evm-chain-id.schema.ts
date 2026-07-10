import { EvmChainId } from 'types/chain-id';
import z from 'zod';

/** Supported EVM chain ID: 1 = Ethereum Mainnet, 56 = BNB Smart Chain, 8453 = Base Mainnet. */
export const evmChainIdSchema = z
  .union([z.literal(1), z.literal(56), z.literal(8453)])
  .transform((val) => val as EvmChainId)
  .describe('EVM chain ID: 1 (Ethereum), 56 (BSC), or 8453 (Base)');
