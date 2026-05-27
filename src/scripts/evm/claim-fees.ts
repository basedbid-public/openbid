import collectFeeForLBPFacetAbi from 'constants/abi/CollectFeeForLBPFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { EvmApiResponse } from 'interfaces';
import {
  ClaimEvmFeesSdk,
  claimEvmFeesSdkSchema,
} from 'schema/claim-fees/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi, initRpcClients, sendTransaction } from 'utils';

export const claimEvmFees = async (
  args: ClaimEvmFeesSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nEVM Claim Fees - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironment();

  const argsValidated = claimEvmFeesSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  if (dryRun?.printPayload) {
    console.log('Chain ID:', argsValidated.data.chainId);
    console.log('Target:', argsValidated.data.target);
    console.log('Address:', argsValidated.data.address);
  }

  const { publicClient, walletClient, account } = initRpcClients(
    argsValidated.data.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  const apiPayload = {
    chainId: argsValidated.data.chainId,
    account: account.address,
    target: argsValidated.data.target,
    address: argsValidated.data.address,
  };

  if (dryRun?.printPayload) {
    console.log('Account (from wallet):', account.address);
    console.log('\nAPI Payload for /collect-fee:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /collect-fee (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /collect-fee');
    console.log('Target:', argsValidated.data.target);
    console.log('Address:', argsValidated.data.address);
    console.log('Recipient:', account.address);
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'collect-fee',
    {
      data: apiPayload,
    },
    'Failed to claim fees on EVM',
    args.isSandboxMode,
  );

  const txValue = BigInt(json.value);

  const receipt = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: collectFeeForLBPFacetAbi,
    functionName: json.functionName,
    args: json.args,
    value: txValue,
    errorLabel: 'Claim Fees',
    skipConfirmation: args.isSandboxMode,
  });

  return receipt;
};
