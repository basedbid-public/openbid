import 'dotenv/config';
import { readFileSync } from 'fs';
import { createEvmBoardSchema, CreateEvmBoardSdk } from 'schema/board/evm/sdk';
import { createSolanaBoardApiSchema } from 'schema/board/solana/api';
import { CreateSolanaBoardSdk } from 'schema/board/solana/sdk';
import { BuyEvmSdk, buyEvmSdkSchema } from 'schema/buy/evm/sdk';
import { BuySolanaSdk, buySolanaSdkSchema } from 'schema/buy/solana/sdk';
import {
  ClaimFeesSolanaRequest,
  claimFeesSolanaRequestSchema,
} from 'schema/claim-fees/solana/request';
import {
  CreateFlashTokenEvmSdk,
  evmFlashTokenCreateSdkSchema,
} from 'schema/flash-token/evm/sdk';
import {
  CreateSolanaFlashInput,
  createSolanaFlashInputSchema,
} from 'schema/flash-token/solana/sdk';
import { CreateLbpEvmSdk, evmLbpCreateSchema } from 'schema/lbp/evm/sdk';
import {
  CreateSolanaLbpInput,
  createSolanaLbpInputSchema,
} from 'schema/lbp/solana/sdk-input';
import { SellEvmSdk, sellEvmSdkSchema } from 'schema/sell/evm/sdk';
import { SellSolanaSdk, sellSolanaSdkSchema } from 'schema/sell/solana/sdk';
import { createEvmBoard } from 'scripts/evm/create-board';
import { createEvmFlashToken } from 'scripts/evm/create-flash-token';
import { createEvmLbp } from 'scripts/evm/create-lbp';
import { evmLbpBuy } from 'scripts/evm/lbp-buy';
import { evmLbpSell } from 'scripts/evm/lbp-sell';
import { claimSolanaLbpFees } from 'scripts/solana/claim-lbp-fees';
import { createSolanaBoard } from 'scripts/solana/create-board';
import { createSolanaFlashToken } from 'scripts/solana/create-flash-token';
import { createSolanaLbp } from 'scripts/solana/create-lbp';
import { solanaLbpBuy } from 'scripts/solana/lbp-buy';
import { solanaLbpSell } from 'scripts/solana/lbp-sell';
import z from 'zod';

const [, , operation, configFile] = process.argv;

if (!operation || !configFile) {
  console.error('Usage: npm run <script> -- <operation> <chain> <config-path>');
  console.error(
    'Example: npm run script -- evm-create-lbp evm ./scripts/configs/evm/create-lbp.json',
  );
  process.exit(1);
}

console.log(process.argv);
const config: unknown = JSON.parse(readFileSync(configFile, 'utf-8'));

const validateAndRun = async <T>(
  schema: z.ZodSchema<unknown>,
  fn: (args: T) => Promise<unknown>,
) => {
  console.log(config);
  const argsValidated = schema.safeParse(config);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }
  await fn(argsValidated.data as T);
};

async function run() {
  switch (operation) {
    case 'evm-create-lbp':
      return await validateAndRun<CreateLbpEvmSdk>(
        evmLbpCreateSchema,
        createEvmLbp,
      );
    case 'evm-create-flash-token':
      return await validateAndRun<CreateFlashTokenEvmSdk>(
        evmFlashTokenCreateSdkSchema,
        createEvmFlashToken,
      );
    case 'evm-create-board':
      return await validateAndRun<CreateEvmBoardSdk>(
        createEvmBoardSchema,
        createEvmBoard,
      );
    case 'evm-lbp-buy':
      return await validateAndRun<BuyEvmSdk>(buyEvmSdkSchema, evmLbpBuy);
    case 'evm-lbp-sell':
      return await validateAndRun<SellEvmSdk>(sellEvmSdkSchema, evmLbpSell);
    case 'solana-create-lbp':
      return await validateAndRun<CreateSolanaLbpInput>(
        createSolanaLbpInputSchema,
        createSolanaLbp,
      );
    case 'solana-create-board':
      return await validateAndRun<CreateSolanaBoardSdk>(
        createSolanaBoardApiSchema,
        createSolanaBoard,
      );
    case 'solana-create-flash-token':
      return await validateAndRun<CreateSolanaFlashInput>(
        createSolanaFlashInputSchema,
        createSolanaFlashToken,
      );
    case 'solana-lbp-buy':
      return await validateAndRun<BuySolanaSdk>(
        buySolanaSdkSchema,
        solanaLbpBuy,
      );
    case 'solana-lbp-sell':
      return await validateAndRun<SellSolanaSdk>(
        sellSolanaSdkSchema,
        solanaLbpSell,
      );
    case 'solana-claim-lbp-fees':
      return await validateAndRun<ClaimFeesSolanaRequest>(
        claimFeesSolanaRequestSchema,
        claimSolanaLbpFees,
      );
    default:
      console.error(`Unknown operation: ${operation}`);
      console.error(
        'Available: evm-create-lbp, evm-create-board, evm-lbp-buy, evm-lbp-sell, evm-claim-fees',
      );
      console.error(
        '           solana-create-lbp, solana-create-board, solana-lbp-buy, solana-lbp-sell, solana-claim-lbp-fees',
      );
      process.exit(1);
  }
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
