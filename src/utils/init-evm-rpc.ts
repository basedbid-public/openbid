import { CHAIN_CONFIG } from '@constants';
import { EvmChainId } from '@typedefs';
import { createWalletClient, http } from 'viem';
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
} from 'viem/account-abstraction';

import { createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { BasedBidApi } from './based-bid-api';

export const initEvmClients = (
  chainId: EvmChainId,
  privateKey: `0x${string}`,
  params?: { sponsored?: boolean },
) => {
  const chain = CHAIN_CONFIG[chainId];
  const rpcUrl = BasedBidApi.evmRpcUrl(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    chain,
    transport: http(rpcUrl),
    account,
  });

  const wantsSponsorship = chainId === 8453 && params?.sponsored;

  if (!wantsSponsorship) {
    return { publicClient, walletClient, account };
  }

  const bundlerClient = createBundlerClient({
    client: publicClient,
    chain,
    transport: http(BasedBidApi.paymasterApiUrl),
    paymaster: true,
  });

  return {
    publicClient,
    walletClient,
    account,
    sponsored: {
      bundlerClient,
      smartAccountFactory: async () => {
        const smartAccount = await toCoinbaseSmartAccount({
          client: publicClient,
          owners: [account],
          version: '1',
        });

        smartAccount.userOperation = {
          estimateGas: async (userOperation) => {
            const estimate = await bundlerClient.estimateUserOperationGas(
              userOperation as Parameters<
                typeof bundlerClient.estimateUserOperationGas
              >[0],
            );
            estimate.preVerificationGas = estimate.preVerificationGas * 2n;
            return estimate;
          },
        };

        return smartAccount;
      },
    },
  };
};
