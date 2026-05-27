import 'dotenv/config';
import { ApiType } from 'enums';
import { ClaimSolanaFeeResponse } from 'interfaces/claim-fees/solana/api';
import { validateEnvironmentSolana } from 'schema/environment';
import { ClaimFeesSolanaRequest, claimFeesSolanaRequestSchema } from 'schema/claim-fees/solana/request';
import { BasedBidApi, SolanaWrapper } from 'utils';
import { DryRunOptions } from 'helpers/run';

export const claimSolanaFlashFees = async (args: ClaimFeesSolanaRequest, dryRun?: DryRunOptions) => {
  if (dryRun?.printPayload) {
    console.log('\nSolana Claim Flash Token Fees - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironmentSolana();

  const argsValidated = claimFeesSolanaRequestSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  if (dryRun?.printPayload) {
    console.log('Chain ID:', argsValidated.data.chainId);
    console.log('Address:', argsValidated.data.address);
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const apiPayload = {
    chainId: argsValidated.data.chainId,
    address: argsValidated.data.address,
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
    console.log('Address:', argsValidated.data.address);
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeResponse>(
    ApiType.SDK,
    'sol/collect-flash-fees',
    { data: apiPayload },
    'Failed to claim Solana flash token fees',
    args.isSandboxMode,
  );

  const signature = await solanaWrapper.sendTransaction(
    json.transaction,
    json.blockhash,
    json.lastValidBlockHeight,
    [],
    {
      description: 'Claim Solana Flash Token Fees',
      skipConfirmation: args.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  return signature;
};
