/**
 * Offline regression tests for the shared Solana Fee Builder schema
 * (schema/common/solana-fee-builder.schema.ts) and the wire-payload builder.
 * Deterministic - no network. Run with: npm test
 *
 * Guards the invariants that were previously unenforced (or enforced
 * differently per schema copy) and caused post-payment launch failures:
 * six buckets <= 50, 2-dp float percents, customFeePercent consistency,
 * atomic-unit collect thresholds, conditional wallet/mint requirements.
 */
import {
  buildSolanaFeeDistributionFields,
  createSolanaFlashInputSchema,
  createSolanaLbpInputSchema,
  solanaFeeDistributionApiPayloadSchema,
} from '@schema';
import { readFileSync } from 'fs';
import { join } from 'path';

const W1 = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const W2 = '7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean) => {
  if (ok) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}`);
  }
};

const baseFees = {
  feeDistribution: true,
  dynamicFee: false,
  liquidityPercent: 10,
  buybackPercent: 10,
  rewardPercent: 0,
  marketingPercent: 10,
  creatorPercent: 10,
  customFeePercent: 10,
  marketingWalletAddress: W1,
  customFees: [{ percent: 10, walletAddress: W2, name: 'kol' }],
  collectQuoteThreshold: '1000000000',
  collectBaseThreshold: '1000000000',
  feeDistributionPayoutKind: 'SOL' as const,
  feeDistributionPayoutCustomMint: '',
  minTokenBalanceForDividends: '0.5',
};

const flashBase = {
  chainId: 501,
  flashDex: 1,
  token: {
    name: 'T',
    symbol: 'T',
    totalSupply: '1000000000',
    initialBuySupplyPercent: '0',
    metadata: { logo: './logo.png', description: 'd' },
  },
  meteora: {
    virtualUsd: 3000,
    nativeSolPriceUsd: 150,
    feeTierIndex: '0',
    hasHookDynamicFee: false,
    finalStartPrice: 0.000009,
  },
};

check(
  'valid fees, total exactly 50',
  createSolanaFlashInputSchema.safeParse({ ...flashBase, fees: baseFees })
    .success,
);

check(
  '2-dp float percents accepted (webapp posts these)',
  createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, liquidityPercent: 9.99, buybackPercent: 10.01 },
  }).success,
);

check(
  '3-dp percent rejected',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, liquidityPercent: 9.999, buybackPercent: 10.001 },
  }).success,
);

check(
  'total 51 rejected (on-chain cap is 50)',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, creatorPercent: 11 },
  }).success,
);

check(
  'customFeePercent != sum(customFees) rejected',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, customFeePercent: 5 },
  }).success,
);

check(
  'marketingPercent>0 without wallet rejected',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, marketingWalletAddress: undefined },
  }).success,
);

check(
  'rewardPercent>0 without rewardToken rejected',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, rewardPercent: 5, creatorPercent: 5 },
  }).success,
);

check(
  'feeDistribution enabled with all-zero splits rejected',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: {
      ...baseFees,
      liquidityPercent: 0,
      buybackPercent: 0,
      marketingPercent: 0,
      creatorPercent: 0,
      customFeePercent: 0,
      customFees: [],
    },
  }).success,
);

check(
  'duplicate custom wallets rejected',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: {
      ...baseFees,
      customFeePercent: 10,
      customFees: [
        { percent: 5, walletAddress: W2, name: 'a' },
        { percent: 5, walletAddress: W2, name: 'b' },
      ],
    },
  }).success,
);

check(
  'decimal collectQuoteThreshold rejected (keeper reads decimals as 0)',
  !createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: { ...baseFees, collectQuoteThreshold: '1.5' },
  }).success,
);

check(
  'board alone passes (boardOwner removed - server derives it)',
  createSolanaFlashInputSchema.safeParse({ ...flashBase, board: 'My Board' })
    .success,
);

const noCustomPct: Record<string, unknown> = { ...baseFees };
delete noCustomPct.customFeePercent;
check(
  'customFeePercent omitted is derived from customFees',
  createSolanaFlashInputSchema.safeParse({ ...flashBase, fees: noCustomPct })
    .success,
);

const parsedFlash = createSolanaFlashInputSchema.parse({
  ...flashBase,
  fees: noCustomPct,
});
const fields = buildSolanaFeeDistributionFields(parsedFlash.fees!);
check('builder derives customFeePercent', fields.customFeePercent === 10);
check('builder coerces rewardToken to empty string', fields.rewardToken === '');
check(
  'builder output passes wire schema with chainId/address',
  solanaFeeDistributionApiPayloadSchema.safeParse({
    chainId: 501,
    address: W2,
    ...fields,
  }).success,
);

check(
  'float dust sum (0.1+0.2) tolerated',
  createSolanaFlashInputSchema.safeParse({
    ...flashBase,
    fees: {
      ...baseFees,
      customFeePercent: 0.3,
      customFees: [
        { percent: 0.1, walletAddress: W2, name: 'a' },
        { percent: 0.2, walletAddress: W1, name: 'b' },
      ],
    },
  }).success,
);

const lbpBase = {
  chainId: 501,
  package: 'based',
  token: {
    name: 'T',
    symbol: 'T',
    totalSupply: '1000000000',
    initialBuyAmount: '0',
    metadata: { logo: './logo.png', description: 'd' },
  },
  dex: { version: 'meteora', feeTier: '0' },
};
const lbpParsed = createSolanaLbpInputSchema.safeParse({
  ...lbpBase,
  fees: { ...baseFees, buyPoolCreator: 0.01, graduation: 0.025 },
});
check('LBP fees with pool-fee fields pass', lbpParsed.success);
if (!lbpParsed.success) console.log(lbpParsed.error.message);

check(
  'LBP total 51 rejected',
  !createSolanaLbpInputSchema.safeParse({
    ...lbpBase,
    fees: { ...baseFees, creatorPercent: 11 },
  }).success,
);

if (lbpParsed.success && lbpParsed.data.fees) {
  const lbpFields = buildSolanaFeeDistributionFields(lbpParsed.data.fees);
  check(
    'LBP wire fields exclude pool-fee extras (buyPoolCreator)',
    !('buyPoolCreator' in lbpFields),
  );
}

// The shipped sample configs must always pass SDK validation - a config that
// drifts out of sync with the schema fails users on their first run.
const configDir = join(__dirname, '..', 'helpers', 'configs', 'solana');
const flashConfig = JSON.parse(
  readFileSync(join(configDir, 'create-flash-token.json'), 'utf8'),
);
const lbpConfig = JSON.parse(
  readFileSync(join(configDir, 'create-lbp.json'), 'utf8'),
);
check(
  'sample config create-flash-token.json passes SDK validation',
  createSolanaFlashInputSchema.safeParse(flashConfig).success,
);
check(
  'sample config create-lbp.json passes SDK validation',
  createSolanaLbpInputSchema.safeParse(lbpConfig).success,
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
