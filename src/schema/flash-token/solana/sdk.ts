import { SolanaDexType } from 'enums';
import {
  metadataInputSchema,
  solanaAddressSchema,
  solanaDecimalsSchema,
} from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

export const createSolanaFlashInputSchema = z
  .object({
    isSandboxMode: z.boolean().default(false),
    chainId: solanaChainIdSchema,
    flashDex: z.enum(SolanaDexType),
    board: z.string().optional(),
    boardOwner: solanaAddressSchema.optional(),
    token: z.object({
      name: z.string().max(100, 'Token name must be less than 100 characters'),
      symbol: z
        .string()
        .max(100, 'Token symbol must be less than 100 characters'),
      totalSupply: z.string(),
      decimals: solanaDecimalsSchema,
      metadata: metadataInputSchema,
    }),
    raydium: z
      .object({
        feeTierIndex: z.string(),
        finalStartPrice: z.number().positive(),
        hasInitialSwap: z.boolean(),
        solanaInitialBuyHuman: z.string(),
      })
      .optional(),
    meteora: z
      .object({
        virtualUsd: z.number().positive(),
        nativeSolPriceUsd: z.number().positive(),
        feeTierIndex: z.string(),
        hasHookDynamicFee: z.boolean(),
        boardSeed: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.flashDex === SolanaDexType.RAYDIUM) {
        return data.raydium !== undefined;
      }
      return data.meteora !== undefined;
    },
    {
      message:
        'Raydium or Meteora parameters must be provided based on chosen DEX',
    },
  )
  .refine(
    (data) => {
      if (data.board && !data.boardOwner) {
        return false;
      }
      if (!data.board && data.boardOwner) {
        return false;
      }

      return data.board === undefined && data.boardOwner === undefined;
    },
    {
      message:
        'board and boardOwner must both be defined if one of them is defined',
    },
  );

export type CreateSolanaFlashInput = z.infer<
  typeof createSolanaFlashInputSchema
>;
