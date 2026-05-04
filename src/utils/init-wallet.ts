import { CHAIN_CONFIG } from 'constants/chain-config';
import { ChainId } from 'types/chain-id';
import { createWalletClient, http } from 'viem';

import { createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const initRpcClients = (
  chainId: ChainId,
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
    transport: http(rpcUrl),
    account,
  });

  return { publicClient, walletClient, account };
};
