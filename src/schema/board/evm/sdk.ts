import { boardFeeSchema, evmChainIdSchema } from 'schema/common';
import { z } from 'zod';

export const createEvmBoardSchema = z.object({
  chainId: evmChainIdSchema,
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long'),
  logo: z.string().min(1, 'Logo file path is required'),
  banner: z.string().min(1, 'Banner file path is required'),
  fees: z.array(boardFeeSchema).optional(),
});

export type CreateEvmBoardSdk = z.infer<typeof createEvmBoardSchema>;
