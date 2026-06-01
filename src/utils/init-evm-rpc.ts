import { CHAIN_CONFIG } from '@constants/index';
import { EvmChainId } from 'types/chain-id';
import { createWalletClient, http } from 'viem';

import { createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { BasedBidApi } from './based-bid-api';

export const initEvmClients = (
  chainId: EvmChainId,
  privateKey: `0x${string}`,
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

  return { publicClient, walletClient, account };
};
