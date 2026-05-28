import {
  SOLANA_CHAIN_NAME_CONFIG,
  SOLANA_CHAIN_SLUG_CONFIG,
} from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { ClaimSolanaFeeResponse } from 'interfaces/claim-fees/solana/api';
import {
  ClaimSolanaLbpFeesRequest,
  claimSolanaLbpFeesRequestSchema,
} from 'schema/claim-fees/solana/lbp-request';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const claimSolanaLbpFees = async (
  args: ClaimSolanaLbpFeesRequest,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nSolana Claim LBP Fees - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironmentSolana();

  const data = claimSolanaLbpFeesRequestSchema.parse(args);

  if (dryRun?.printPayload) {
    console.log('Chain ID:', data.chainId);
    console.log('Token Mint:', data.memeMint);
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const apiPayload = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.memeMint,
    isSandboxMode: data.isSandboxMode,
  };

  if (dryRun?.printPayload) {
    console.log('Signer (from wallet):', solanaWrapper.publicKey);
    console.log('\nAPI Payload for /sol/collect-lbp-fees:');
    console.log(JSON.stringify(apiPayload, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /sol/collect-lbp-fees (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /sol/collect-lbp-fees');
    console.log('Token Mint:', data.memeMint);
    console.log('========================================\n');
    return { dryRun: true, payload: apiPayload };
  }

  console.log('Calling API for LBP fees collection...');

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeResponse>(
    ApiType.SDK,
    'sol/collect-lbp-fees',
    apiPayload,
    'Failed to claim LBP fees on Solana',
    args.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    [],
    {
      description: 'Claim LBP Fees',
      skipConfirmation: args.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  console.log('\n--- RESULT ---');
  console.log(
    JSON.stringify(
      {
        ok: true,
        type: 'fees',
        network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
        tokenAddress: data.memeMint,
        signature,
        basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[args.chainId]}/token/${data.memeMint}`,
      },
      null,
      2,
    ),
  );
};
