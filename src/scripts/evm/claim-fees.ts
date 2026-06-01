import collectFeeForLBPFacetAbi from 'constants/abi/CollectFeeForLBPFacet.json';
import { CHAIN_NAME_CONFIG } from 'constants/chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { EvmApiResponse, OpenbidRunOptions } from 'interfaces/common';
import {
  ClaimEvmFeesSdk,
  claimEvmFeesSdkSchema,
} from 'schema/claim-fees/evm/sdk';
import {
  BasedBidApi,
  EvmValidator,
  initEvmClients,
  LogHelper,
  sendTransaction,
} from 'utils';

export const claimEvmFees = async (
  args: ClaimEvmFeesSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = options ?? {};

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Claiming Fees on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<ClaimEvmFeesSdk>(
    claimEvmFeesSdkSchema,
    args,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const { publicClient, walletClient, account } = initEvmClients(
    data.chainId,
    env.PRIVATE_KEY,
  );

  const apiPayload = {
    data: {
      ...data,
      account: account.address,
    },
  };

  if (printPayload) {
    console.log('Account (from wallet):', account.address);
    LogHelper.printApiPayload('collect-fee', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('collect-fee', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'collect-fee',
    apiPayload,
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

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    target: data.target,
    address: data.address,
    signature: receipt.transactionHash,
  });

  return receipt;
};
