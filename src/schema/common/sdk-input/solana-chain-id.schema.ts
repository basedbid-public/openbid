import z from 'zod';

export const solanaChainIdSchema = z.union([z.literal(501), z.literal(5011)]);
