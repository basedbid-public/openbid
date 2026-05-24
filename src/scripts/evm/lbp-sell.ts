import tradeFacetAbi from '@constants/abi/TradeFacet.json';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { SellResponse } from 'interfaces/sell/response';
import { validateEnvironment } from 'schema/environment';
import { SellEvmSdk } from 'schema/sell/evm/sdk';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-evm-rpc';
import { sendTransaction } from 'utils/send-transaction';
import { erc20Abi } from 'viem';

export const sell = async (params: SellEvmSdk) => {
  const env = validateEnvironment();

  const endpoint = `${API_URL}/lbp-sell-preview`;

  const json = await BasedBidApi.invokeApi<SellResponse>(
    endpoint,
    {
      data: params,
    },
    'Failed to sell LBP on EVM',
  );

  const { publicClient, walletClient, account } = initRpcClients(
    params.chainId,
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
