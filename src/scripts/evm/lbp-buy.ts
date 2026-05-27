import tradeFacetAbi from 'constants/abi/TradeFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { EvmApiResponse } from 'interfaces';
import { BuyEvmSdk, buyEvmSdkSchema } from 'schema/buy/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi, initRpcClients, sendTransaction } from 'utils';

export const evmLbpBuy = async (args: BuyEvmSdk, dryRun?: DryRunOptions) => {
  if (dryRun?.printPayload) {
    console.log('\nEVM LBP Buy - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironment();

  const argsValidated = buyEvmSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  if (dryRun?.printPayload) {
    console.log('Chain ID:', argsValidated.data.chainId);
    console.log('Token Address:', argsValidated.data.address);
    console.log('Amount:', argsValidated.data.amount);
    console.log('Slippage:', argsValidated.data.slippage, '%');
  }

  const apiPayload = {
    chainId: argsValidated.data.chainId,
    address: argsValidated.data.address,
    account: '0x0000000000000000000000000000000000000000',
    slippage: argsValidated.data.slippage,
    referrer: argsValidated.data.referrer,
    amount: argsValidated.data.amount,
  };

  if (dryRun?.printPayload) {
    console.log('\nAPI Payload for /lbp-buy-preview:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /lbp-buy-preview (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /lbp-buy-preview');
    console.log('Token:', argsValidated.data.address);
    console.log('Amount:', argsValidated.data.amount, 'ETH');
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const { publicClient, walletClient, account } = initRpcClients(
    argsValidated.data.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

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

  return await sendTransaction({
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
};
