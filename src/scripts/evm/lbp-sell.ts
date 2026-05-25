import tradeFacetAbi from 'constants/abi/TradeFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { SellEvmApiResponse } from 'interfaces';
import { validateEnvironment } from 'schema/environment';
import { SellEvmSdk } from 'schema/sell/evm/sdk';
import { BasedBidApi, initRpcClients, sendTransaction } from 'utils';
import { erc20Abi } from 'viem';

export const sell = async (args: SellEvmSdk) => {
  const env = validateEnvironment();

  const json = await BasedBidApi.invokeApi<SellEvmApiResponse>(
    ApiType.SDK,
    'lbp-sell-preview',
    {
      data: args,
    },
    'Failed to sell LBP on EVM',
    args.isSandboxMode,
  );

  const { publicClient, walletClient, account } = initRpcClients(
    args.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  // First transaction: Approve token spending
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
  });

  console.log(
    'Approval transaction confirmed:',
    approveReceipt.transactionHash,
  );

  // Second transaction: Execute sell
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
  });

  return sellReceipt;
};
