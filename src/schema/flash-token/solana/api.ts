import { SOLANA_DECIMALS } from 'constants/solana';
import { SolanaFlashDexType } from 'enums';
import {
  metadataUrlSchema,
  numberStringSchema,
  solanaAddressSchema,
} from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input';
import { z } from 'zod';

const tokenSchemaTx1 = z.object({
  name: z.string().max(100),
  symbol: z.string().max(100),
  metadataUrl: metadataUrlSchema,
  totalSupply: z.string(),
  decimals: SOLANA_DECIMALS,
  initialBuySupplyPercent: numberStringSchema(),
});

const tokenSchemaTx2 = z.object({
  totalSupply: z.string(),
  decimals: z.literal(9),
  initialBuySupplyPercent: numberStringSchema(),
});

export const createSolanaFlashTx1ApiSchema = z
  .object({
    chainId: solanaChainIdSchema,
    signer: solanaAddressSchema,
    flashDex: z.union([
      z.literal(SolanaFlashDexType.RAYDIUM),
      z.literal(SolanaFlashDexType.METEORA),
    ]),
    token: tokenSchemaTx1,

    hasInitialSwap: z.boolean().optional(),
    // Raydium specific
    raydiumFeeTierIndex: z.string().optional(),
    finalStartPrice: z.number().positive().optional(),
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
      if (data.flashDex === SolanaFlashDexType.RAYDIUM) {
        return (
          data.raydiumFeeTierIndex !== undefined &&
          data.finalStartPrice !== undefined
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
        'Raydium specific fields are required when DEX version is raydium, and Meteora specific fields are required when DEX version is meteora',
    },
  );

export type CreateSolanaFlashTx1Api = z.infer<
  typeof createSolanaFlashTx1ApiSchema
>;

export const createSolanaFlashTx2ApiSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: solanaAddressSchema,
  flashDex: z.union([
    z.literal(SolanaFlashDexType.RAYDIUM),
    z.literal(SolanaFlashDexType.METEORA),
  ]),
  tx1Signature: z.string(),
  flashSeed: z.string(),
  mintAddress: z.string(),
  baseTokenMint: z.string(),
  raiseTokenDecimals: z.literal(9),
  token: tokenSchemaTx2,
  // Raydium specific
  raydiumFeeTierIndex: z.string().optional(),
  finalStartPrice: z.number().positive().optional(),
  // Meteora specific
  meteoraFeeTierIndex: z.string().optional(),
  meteoraTokenAccountSeed: z.string().optional(),
});

export type CreateSolanaFlashTx2Api = z.infer<
  typeof createSolanaFlashTx2ApiSchema
>;
