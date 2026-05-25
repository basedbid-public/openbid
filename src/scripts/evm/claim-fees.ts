import collectFeeForLBPFacetAbi from 'constants/abi/CollectFeeForLBPFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { EvmApiResponse } from 'interfaces';
import { ClaimEvmFeesSdk } from 'schema/claim-fees/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi, initRpcClients, sendTransaction } from 'utils';
export const claimEvmFees = async (args: ClaimEvmFeesSdk) => {
  const env = validateEnvironment();

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
    ApiType.SDK,
    'collect-fee',
    {
      data: payload,
    },
    'Failed to claim fees on EVM',
    args.isSandboxMode,
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
