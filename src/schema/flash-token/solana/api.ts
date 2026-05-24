import { SOLANA_DECIMALS } from 'constants/solana';
import { metadataUrlSchema } from 'schema/common';
import { solanaAddressSchema } from 'schema/common/solana-address.schema';
import { z } from 'zod';

const tokenSchemaTx1 = z.object({
  name: z.string().max(100),
  symbol: z.string().max(100),
  metadataUrl: metadataUrlSchema,
  totalSupply: z.string(),
  decimals: SOLANA_DECIMALS,
});

const tokenSchemaTx2 = z.object({
  totalSupply: z.string(),
  decimals: z.literal(9),
});

export const createSolanaFlashTx1ApiSchema = z
  .object({
    chainId: z.literal(5011),
    signer: solanaAddressSchema,
    flashDex: z.union([z.literal(1), z.literal(2)]), // 1 = Meteora, 2 = Raydium
    token: tokenSchemaTx1,
    // Raydium specific
    raydiumFeeTierIndex: z.string().optional(),
    finalStartPrice: z.number().positive().optional(),
    hasInitialSwap: z.boolean().optional(),
    solanaInitialBuyHuman: z.string().optional(),
    // Meteora specific
    baseTokenMint: z.string().optional(),
    virtualUsd: z.number().positive().optional(),
    nativeSolPriceUsd: z.number().positive().optional(),
    meteoraFeeTierIndex: z.string().optional(),
    hasHookDynamicFee: z.boolean().optional(),
    boardSeed: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.flashDex === 1) {
        return (
          data.raydiumFeeTierIndex !== undefined &&
          data.finalStartPrice !== undefined &&
          data.hasInitialSwap !== undefined &&
          data.solanaInitialBuyHuman !== undefined
        );
      }
      return (
        data.baseTokenMint !== undefined &&
        data.virtualUsd !== undefined &&
        data.nativeSolPriceUsd !== undefined &&
        data.meteoraFeeTierIndex !== undefined &&
        data.hasHookDynamicFee !== undefined &&
        data.boardSeed !== undefined
      );
    },
    {
      message:
        'Raydium specific fields are required when flashDex is 1, and Meteora specific fields are required when flashDex is 2',
    },
  );

export type CreateSolanaFlashTx1Api = z.infer<
  typeof createSolanaFlashTx1ApiSchema
>;

export const createSolanaFlashTx2ApiSchema = z.object({
  chainId: z.literal(5011),
  signer: solanaAddressSchema,
  flashDex: z.union([z.literal(1), z.literal(2)]),
  tx1Signature: z.string(),
  flashSeed: z.string(),
  mintAddress: z.string(),
  baseTokenMint: z.string(),
  raiseTokenDecimals: z.literal(9),
  token: tokenSchemaTx2,
  // Raydium specific
  raydiumFeeTierIndex: z.string().optional(),
  finalStartPrice: z.number().positive().optional(),
  hasInitialSwap: z.boolean().optional(),
  solanaInitialBuyHuman: z.string().optional(),
  // Meteora specific
  meteoraFeeTierIndex: z.string().optional(),
  meteoraTokenAccountSeed: z.string().optional(),
});

export type CreateSolanaFlashTx2Api = z.infer<
  typeof createSolanaFlashTx2ApiSchema
>;
