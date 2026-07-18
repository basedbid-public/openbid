import { CHAIN_NAME_CONFIG, CHAIN_SLUG_CONFIG } from '@constants';
import tradeFacetAbi from '@constants/abi/TradeFacet.json';
import { ApiType } from '@enums';
import { EvmApiResponse, OpenbidRunOptions, resolveRunMode } from '@interfaces';
import { BuyEvmSdk, buyEvmSdkSchema } from '@schema';
import {
  BasedBidApi,
  EvmValidator,
  initEvmClients,
  LogHelper,
  sendTransaction,
} from '@utils';
import 'dotenv/config';

export const evmLbpBuy = async (
  args: BuyEvmSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Buying LBP on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<BuyEvmSdk>(
    buyEvmSdkSchema,
    args,
    options,
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
    LogHelper.printApiPayload('create-flash', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('lbp-buy-preview', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'lbp-buy-preview',
    {
      data: apiPayload,
    },
    'Failed to buy LBP on EVM',
    args.isSandboxMode,
  );

  const txValue = BigInt(json.value);

  const result = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: tradeFacetAbi,
    functionName: json.functionName,
    args: json.args,
    value: txValue,
    errorLabel: 'Buy',
    skipConfirmation: args.isSandboxMode,
  });

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    tokenAddress: data.address,
    signature: result.transactionHash,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${CHAIN_SLUG_CONFIG[data.chainId]}/token/${json.address}`,
  });

  return result;
};
