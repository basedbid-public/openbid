import 'dotenv/config';
import { readFileSync } from 'fs';

export interface DryRunOptions {
  dryRun: boolean;
  validate: boolean;
  printPayload: boolean;
}

import { createEvmBoardSchema, CreateEvmBoardSdk } from 'schema/board/evm/sdk';
import {
  CreateSolanaBoardSdk,
  createSolanaBoardSdkSchema,
} from 'schema/board/solana/sdk';
import { BuyEvmSdk, buyEvmSdkSchema } from 'schema/buy/evm/sdk';
import { BuySolanaSdk, buySolanaSdkSchema } from 'schema/buy/solana/sdk';
import {
  ClaimEvmFeesSdk,
  claimEvmFeesSdkSchema,
} from 'schema/claim-fees/evm/sdk';
import {
  ClaimFeesSolanaRequest,
  claimSolanaFlashTokenFeesRequestSchema,
} from 'schema/claim-fees/solana/flash-request';
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
import { claimEvmFees } from 'scripts/evm/claim-fees';
import { createEvmBoard } from 'scripts/evm/create-board';
import { createEvmFlashToken } from 'scripts/evm/create-flash-token';
import { createEvmLbp } from 'scripts/evm/create-lbp';
import { evmLbpBuy } from 'scripts/evm/lbp-buy';
import { evmLbpSell } from 'scripts/evm/lbp-sell';
import { claimSolanaFlashFees } from 'scripts/solana/claim-flash-token-fees';
import { claimSolanaLbpFees } from 'scripts/solana/claim-lbp-fees';
import { createSolanaBoard } from 'scripts/solana/create-board';
import { createSolanaFlashToken } from 'scripts/solana/create-flash-token';
import { createSolanaLbp } from 'scripts/solana/create-lbp';
import { solanaLbpBuy } from 'scripts/solana/lbp-buy';
import { solanaLbpSell } from 'scripts/solana/lbp-sell';

const [, , operation, configFile, ...extraArgs] = process.argv;

const dryRunOptions: DryRunOptions = {
  dryRun: extraArgs.includes('--dry-run'),
  validate: extraArgs.includes('--validate'),
  printPayload:
    extraArgs.includes('--dry-run') || extraArgs.includes('--validate'),
};

if (!operation || !configFile) {
  console.error(
    'Usage: npm run <script> -- <operation> <config-file> [--dry-run] [--validate]',
  );
  console.error(
    'Example: npm run evm:create-lbp -- evm-create-lbp ./configs/evm/create-lbp.json --dry-run',
  );
  console.error('');
  console.error('Flags:');
  console.error(
    '  --dry-run   Validate and print API payloads, but skip IPFS uploads, API calls, and transactions',
  );
  console.error(
    '  --validate  Validate config schema and print summary, skip all operations',
  );
  process.exit(1);
}

if (extraArgs.includes('--help') || extraArgs.includes('-h')) {
  console.log('Dry Run / Validate Mode');
  console.log('');
  console.log('Flags:');
  console.log(
    '  --dry-run   Validate env + schema, print API payloads, skip actual execution',
  );
  console.log(
    '  --validate  Validate schema only, print config summary, skip all operations',
  );
  console.log('  --help      Show this help message');
  process.exit(0);
}

const configContent = readFileSync(configFile, 'utf-8');
const config = JSON.parse(configContent) as unknown;

if (dryRunOptions.printPayload) {
  console.log('\n========== DRY RUN / VALIDATE MODE ==========\n');
  console.log('Operation:', operation);
  console.log('Config file:', configFile);
  console.log('Options:', dryRunOptions);
  console.log('\n---------- Loaded Config ----------');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n');
}

const validateAndRun = async <T>(
  schema: import('zod').ZodSchema<unknown>,
  fn: (args: T, dryRun?: DryRunOptions) => Promise<unknown>,
  operationName: string,
) => {
  const argsValidated = schema.safeParse(config);
  if (!argsValidated.success) {
    console.error(`\nSchema validation failed for ${operationName}:`);
    console.error(argsValidated.error.message);
    if (dryRunOptions.printPayload) {
      console.log('\n========== VALIDATION FAILED ==========\n');
    }
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  console.log(`\nSchema validation passed for ${operationName}`);

  if (dryRunOptions.validate) {
    console.log(
      '\n========== VALIDATE MODE - No operations executed ==========\n',
    );
    return { validated: true };
  }

  if (dryRunOptions.dryRun) {
    console.log(
      '\n========== DRY RUN MODE - Will not execute side effects ==========\n',
    );
  }

  await fn(argsValidated.data as T, dryRunOptions);
};

async function run() {
  switch (operation) {
    case 'evm-create-lbp':
      return await validateAndRun<CreateLbpEvmSdk>(
        evmLbpCreateSchema,
        createEvmLbp,
        'EVM Create LBP',
      );
    case 'evm-create-flash-token':
      return await validateAndRun<CreateFlashTokenEvmSdk>(
        evmFlashTokenCreateSdkSchema,
        createEvmFlashToken,
        'EVM Create Flash Token',
      );
    case 'evm-create-board':
      return await validateAndRun<CreateEvmBoardSdk>(
        createEvmBoardSchema,
        createEvmBoard,
        'EVM Create Board',
      );
    case 'evm-lbp-buy':
      return await validateAndRun<BuyEvmSdk>(
        buyEvmSdkSchema,
        evmLbpBuy,
        'EVM LBP Buy',
      );
    case 'evm-lbp-sell':
      return await validateAndRun<SellEvmSdk>(
        sellEvmSdkSchema,
        evmLbpSell,
        'EVM LBP Sell',
      );
    case 'evm-claim-fees':
      return await validateAndRun<ClaimEvmFeesSdk>(
        claimEvmFeesSdkSchema,
        claimEvmFees,
        'EVM Claim Fees',
      );
    case 'solana-create-lbp':
      return await validateAndRun<CreateSolanaLbpInput>(
        createSolanaLbpInputSchema,
        createSolanaLbp,
        'Solana Create LBP',
      );
    case 'solana-create-board':
      return await validateAndRun<CreateSolanaBoardSdk>(
        createSolanaBoardSdkSchema,
        createSolanaBoard,
        'Solana Create Board',
      );
    case 'solana-create-flash-token':
      return await validateAndRun<CreateSolanaFlashInput>(
        createSolanaFlashInputSchema,
        createSolanaFlashToken,
        'Solana Create Flash Token',
      );
    case 'solana-lbp-buy':
      return await validateAndRun<BuySolanaSdk>(
        buySolanaSdkSchema,
        solanaLbpBuy,
        'Solana LBP Buy',
      );
    case 'solana-lbp-sell':
      return await validateAndRun<SellSolanaSdk>(
        sellSolanaSdkSchema,
        solanaLbpSell,
        'Solana LBP Sell',
      );
    case 'solana-claim-lbp-fees':
      return await validateAndRun<ClaimFeesSolanaRequest>(
        claimSolanaFlashTokenFeesRequestSchema,
        claimSolanaLbpFees,
        'Solana Claim LBP Fees',
      );
    case 'solana-claim-flash-fees':
      return await validateAndRun<ClaimFeesSolanaRequest>(
        claimSolanaFlashTokenFeesRequestSchema,
        claimSolanaFlashFees,
        'Solana Claim Flash Token Fees',
      );
    default:
      console.error(`\nUnknown operation: ${operation}`);
      console.error(
        '\nAvailable operations:',
        '\n  EVM: evm-create-lbp, evm-create-flash-token, evm-create-board, evm-lbp-buy, evm-lbp-sell, evm-claim-fees',
        '\n  Solana: solana-create-lbp, solana-create-flash-token, solana-create-board, solana-lbp-buy, solana-lbp-sell, solana-claim-lbp-fees, solana-claim-flash-fees',
      );
      process.exit(1);
  }
}

run().catch((err) => {
  console.error('Script failed:', err);

  process.exit(1);
});
