import { SOLANA_CHAIN_NAME_CONFIG } from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { ClaimSolanaFeeResponse } from 'interfaces/claim-fees/solana/api';
import {
  ClaimSolanaFlashTokenFeesRequest,
  claimSolanaFlashTokenFeesRequestSchema,
} from 'schema/claim-fees/solana/flash-request';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const claimSolanaFlashFees = async (
  args: ClaimSolanaFlashTokenFeesRequest,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nSolana Claim Flash Token Fees - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironmentSolana();

  const argsValidated = claimSolanaFlashTokenFeesRequestSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  if (dryRun?.printPayload) {
    console.log('Chain ID:', argsValidated.data.chainId);
    console.log('Flash Mint:', argsValidated.data.flashMint);
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const apiPayload = {
    chainId: argsValidated.data.chainId,
    flashMint: argsValidated.data.flashMint,
    signer: solanaWrapper.publicKey,
  };

  if (dryRun?.printPayload) {
    console.log('\nAPI Payload for /sol/collect-flash-fees:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /sol/collect-flash-fees (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /sol/collect-flash-fees');
    console.log('Flash Mint:', argsValidated.data.flashMint);
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeResponse>(
    ApiType.SDK,
    'sol/collect-flash-fees',
    apiPayload,
    'Failed to claim Solana flash token fees',
    args.isSandboxMode,
  );

  const signature = await solanaWrapper.sendTransaction(
    json.transaction,
    json.blockhash,
    json.lastValidBlockHeight,
    undefined,
    [],
    {
      description: 'Claim Solana Flash Token Fees',
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
        network: SOLANA_CHAIN_NAME_CONFIG[argsValidated.data.chainId],
        flashMint: argsValidated.data.flashMint,
        signature,
      },
      null,
      2,
    ),
  );

  return signature;
};
