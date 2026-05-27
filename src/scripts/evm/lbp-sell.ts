import tradeFacetAbi from 'constants/abi/TradeFacet.json';
import { CHAIN_NAME_CONFIG, CHAIN_SLUG_CONFIG } from 'constants/chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { SellEvmApiResponse } from 'interfaces';
import { validateEnvironment } from 'schema/environment';
import { SellEvmSdk, sellEvmSdkSchema } from 'schema/sell/evm/sdk';
import { BasedBidApi, initRpcClients, sendTransaction } from 'utils';
import { erc20Abi } from 'viem';

export const evmLbpSell = async (args: SellEvmSdk, dryRun?: DryRunOptions) => {
  if (dryRun?.printPayload) {
    console.log('\nEVM LBP Sell - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironment();

  const argsValidated = sellEvmSdkSchema.safeParse(args);
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
    console.log('\nAPI Payload for /lbp-sell-preview:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /lbp-sell-preview (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /lbp-sell-preview');
    console.log('Token:', argsValidated.data.address);
    console.log('Amount:', argsValidated.data.amount, 'tokens');
    console.log('Note: This would require 2 transactions (approve + sell)');
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const { publicClient, walletClient, account } = initRpcClients(
    argsValidated.data.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  const json = await BasedBidApi.invokeApi<SellEvmApiResponse>(
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

  const networkName =
    argsValidated.data.chainId === 8453
      ? 'base-mainnet'
      : argsValidated.data.chainId === 1
        ? 'ethereum-mainnet'
        : 'chain-' + argsValidated.data.chainId;

  console.log('\n--- RESULT ---');
  console.log(
    JSON.stringify(
      {
        ok: true,
        type: 'sell',
        network: CHAIN_NAME_CONFIG[argsValidated.data.chainId],
        tokenAddress: argsValidated.data.address,
        signature: sellReceipt.transactionHash,
        basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${CHAIN_SLUG_CONFIG[argsValidated.data.chainId]}/token/${argsValidated.data.address}`,
      },
      null,
      2,
    ),
  );

  return sellReceipt;
};
