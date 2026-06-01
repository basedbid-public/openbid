import 'dotenv/config';
import { readFileSync } from 'fs';
import { OpenbidRunOptions } from 'interfaces/common';

import { CreateEvmBoardSdk } from 'schema/board/evm/sdk';
import { CreateSolanaBoardSdk } from 'schema/board/solana/sdk';
import { BuyEvmSdk } from 'schema/buy/evm/sdk';
import { BuySolanaSdk } from 'schema/buy/solana/sdk';
import { ClaimEvmFeesSdk } from 'schema/claim-fees/evm/sdk';
import { ClaimSolanaFlashTokenFeesRequest } from 'schema/claim-fees/solana/flash-request';
import { ClaimSolanaLbpFeesRequest } from 'schema/claim-fees/solana/lbp-request';
import { CreateFlashTokenEvmSdk } from 'schema/flash-token/evm/sdk';
import { CreateSolanaFlashInput } from 'schema/flash-token/solana/sdk';
import { CreateLbpEvmSdk } from 'schema/lbp/evm/sdk';
import { CreateSolanaLbpInput } from 'schema/lbp/solana/sdk-input';
import { SellEvmSdk } from 'schema/sell/evm/sdk';
import { SellSolanaSdk } from 'schema/sell/solana/sdk';

import {
  claimEvmFees,
  createEvmBoard,
  createEvmFlashToken,
  createEvmLbp,
  evmLbpBuy,
  evmLbpSell,
} from 'scripts/evm';
import {
  claimSolanaFlashFees,
  claimSolanaLbpFees,
  createSolanaBoard,
  createSolanaFlashToken,
  createSolanaLbp,
  solanaLbpBuy,
  solanaLbpSell,
} from 'scripts/solana';

const [, , operation, configFile, ...extraArgs] = process.argv;

const runOptions: OpenbidRunOptions = {
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
    '  --dry-run   Validate schema, print API payloads, skip actual execution (placeholder wallet if .env missing)',
  );
  console.log(
    '  --validate  Validate schema only, print config summary, skip all operations (no wallet env required)',
  );
  console.log('  --help      Show this help message');
  process.exit(0);
}

const configContent = readFileSync(configFile, 'utf-8');
const config = JSON.parse(configContent) as unknown;

if (runOptions.printPayload) {
  console.log('\n========== DRY RUN / VALIDATE MODE ==========\n');
  console.log('Operation:', operation);
  console.log('Config file:', configFile);
  console.log('Options:', runOptions);
  console.log('\n---------- Loaded Config ----------');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n');
}

async function run() {
  switch (operation) {
    case 'evm-create-lbp':
      return await createEvmLbp(config as CreateLbpEvmSdk, runOptions);
    case 'evm-create-flash-token':
      return await createEvmFlashToken(
        config as CreateFlashTokenEvmSdk,
        runOptions,
      );
    case 'evm-create-board':
      return await createEvmBoard(config as CreateEvmBoardSdk, runOptions);

    case 'evm-lbp-buy':
      return await evmLbpBuy(config as BuyEvmSdk, runOptions);
    case 'evm-lbp-sell':
      return await evmLbpSell(config as SellEvmSdk, runOptions);
    case 'evm-claim-fees':
      return await claimEvmFees(config as ClaimEvmFeesSdk, runOptions);
    case 'solana-create-lbp':
      return await createSolanaLbp(config as CreateSolanaLbpInput, runOptions);
    case 'solana-create-board':
      return await createSolanaBoard(
        config as CreateSolanaBoardSdk,
        runOptions,
      );
    case 'solana-create-flash-token':
      return await createSolanaFlashToken(
        config as CreateSolanaFlashInput,
        runOptions,
      );
    case 'solana-lbp-buy':
      return await solanaLbpBuy(config as BuySolanaSdk, runOptions);
    case 'solana-lbp-sell':
      return await solanaLbpSell(config as SellSolanaSdk, runOptions);
    case 'solana-claim-lbp-fees':
      return await claimSolanaLbpFees(
        config as ClaimSolanaLbpFeesRequest,
        runOptions,
      );
    case 'solana-claim-flash-fees':
      return await claimSolanaFlashFees(
        config as ClaimSolanaFlashTokenFeesRequest,
        runOptions,
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
