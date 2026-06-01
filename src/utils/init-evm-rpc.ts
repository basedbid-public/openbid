import { CHAIN_CONFIG } from '@constants/index';
import { EvmChainId } from 'types/chain-id';
import { createWalletClient, http } from 'viem';

import { createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const initEvmClients = (
  chainId: EvmChainId,
  rpcUrl: string,
  privateKey: `0x${string}`,
) => {
  const chain = CHAIN_CONFIG[chainId];

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    chain,
    transport: http(`https://cdn.based.bid/api/rpc/evm?chainId=${chainId}`),
    account,
  });

  return { publicClient, walletClient, account };
};
