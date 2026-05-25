import tradeFacetAbi from 'constants/abi/TradeFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { EvmApiResponse } from 'interfaces';
import { BuyEvmSdk } from 'schema/buy/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi, initRpcClients, sendTransaction } from 'utils';

export const buyEvm = async (args: BuyEvmSdk) => {
  const env = validateEnvironment();

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'lbp-buy-preview',
    {
      data: args,
    },
    'Failed to buy LBP on EVM',
    args.isSandboxMode,
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
    skipConfirmation: args.isSandboxMode,
  });
};
