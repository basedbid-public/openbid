import tradeFacetAbi from 'constants/abi/TradeFacet.json';
import { CHAIN_NAME_CONFIG, CHAIN_SLUG_CONFIG } from 'constants/chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { OpenbidRunOptions } from 'interfaces/common';
import { EvmSellApiResponse } from 'interfaces/sell';
import { SellEvmSdk, sellEvmSdkSchema } from 'schema/sell/evm/sdk';
import {
  BasedBidApi,
  EvmValidator,
  initEvmClients,
  LogHelper,
  sendTransaction,
} from 'utils';
import { erc20Abi } from 'viem';

export const evmLbpSell = async (
  args: SellEvmSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = options ?? {};

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Selling LBP on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<SellEvmSdk>(
    sellEvmSdkSchema,
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
    chainId: data.chainId,
    address: data.address,
    account: account.address,
    slippage: data.slippage,
    referrer: data.referrer,
    amount: data.amount,
  };

  if (printPayload) {
    LogHelper.printApiPayload('lbp-sell-preview', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('lbp-sell-preview', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<EvmSellApiResponse>(
    ApiType.SDK,
    'lbp-sell-preview',
    {
      data: apiPayload,
    },
    'Failed to sell LBP on EVM',
    args.isSandboxMode,
  );

  const approveTx = json.trx1;
  const approveReceipt = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: approveTx.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'approve',
    args: [approveTx.args[0] as `0x${string}`, BigInt(approveTx.args[1])],
    value: BigInt(approveTx.value),
    errorLabel: 'Approve',
    skipConfirmation: args.isSandboxMode,
  });

  console.log(
    'Approval transaction confirmed:',
    approveReceipt.transactionHash,
  );

  const sellTx = json.trx2;
  const sellReceipt = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: sellTx.address as `0x${string}`,
    abi: tradeFacetAbi,
    functionName: sellTx.functionName,
    args: sellTx.args,
    value: BigInt(sellTx.value),
    errorLabel: 'Sell',
    skipConfirmation: args.isSandboxMode,
  });

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    tokenAddress: data.address,
    signature: sellReceipt.transactionHash,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${CHAIN_SLUG_CONFIG[data.chainId]}/token/${data.address}`,
  });

  return sellReceipt;
};
