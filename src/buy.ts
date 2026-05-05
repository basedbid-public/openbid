import tradeFacetAbi from '@constants/abi/TradeFacet.json';
import { BuyRequest } from '@interfaces/buy/request';
import { BuyResponse } from '@interfaces/buy/response';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { buyApiSchema } from 'schema/buy/api';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-wallet';
import { sendTransaction } from 'utils/send-transaction';

export const buy = async (params: BuyRequest) => {
  const env = validateEnvironment();

  const validated = buyApiSchema.parse(params);

  const endpoint = `${API_URL}/lbp-buy-preview`;

  const json = await BasedBidApi.invokeApi<BuyResponse>(endpoint, {
    data: validated,
  });

  const { publicClient, walletClient, account } = initRpcClients(
    params.chainId,
    env.RPC_URL,
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
