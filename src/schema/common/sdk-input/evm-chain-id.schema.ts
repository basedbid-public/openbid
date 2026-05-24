import { ChainId } from 'types/chain-id';
import z from 'zod';

export const evmChainIdSchema = z
  .union([z.literal(1), z.literal(56), z.literal(137), z.literal(8453)])
  .transform((val) => val as ChainId);
