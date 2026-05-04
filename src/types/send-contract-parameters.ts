import { Abi, Account, Address, PublicClient, WalletClient } from 'viem';

export type SendContractTransactionParams = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Account;
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  value: bigint;
  receiptTimeoutMs?: number;
  explorerTxUrl?: (hash: `0x${string}`) => string;

  /** Prepended to console.error on failure */
  errorLabel?: string;
};
