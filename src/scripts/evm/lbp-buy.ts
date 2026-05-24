import tradeFacetAbi from '@constants/abi/TradeFacet.json';
import { BuyResponse } from '@interfaces/buy/response';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { BuyEvmSdk } from 'schema/buy/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-evm-rpc';
import { sendTransaction } from 'utils/send-transaction';

export const buyEvm = async (args: BuyEvmSdk) => {
  const env = validateEnvironment();

  const endpoint = `${API_URL}/lbp-buy-preview`;

  const json = await BasedBidApi.invokeApi<BuyResponse>(
    endpoint,
    {
      data: args,
    },
    'Failed to buy LBP on EVM',
  );

  const { publicClient, walletClient, account } = initRpcClients(
    args.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
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
  });
};
