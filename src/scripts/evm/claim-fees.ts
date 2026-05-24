import collectFeeForLBPFacetAbi from '@constants/abi/CollectFeeForLBPFacet.json';
import { EvmApiResponse } from '@interfaces/common/evm/api-response';
import { initRpcClients } from '@utils/init-evm-rpc';
import { sendTransaction } from '@utils/send-transaction';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { ClaimEvmFeesSdk } from 'schema/claim-fees/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';
export const claimEvmFees = async (args: ClaimEvmFeesSdk) => {
  const env = validateEnvironment();

  const endpoint = `${API_URL}/collect-fee`;

  const { publicClient, walletClient, account } = initRpcClients(
    args.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  const payload = {
    chainId: args.chainId,
    account: account.address,
    target: args.target,
    address: args.address,
  };

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    endpoint,
    {
      data: payload,
    },
    'Failed to claim fees on EVM',
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
  });

  return receipt;
};
