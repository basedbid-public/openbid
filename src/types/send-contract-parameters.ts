import { Abi, Account, Address, PublicClient, WalletClient } from 'viem';
import type { BundlerClient, SmartAccount } from 'viem/account-abstraction';

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

  /** Skip transaction confirmation prompt (for automated flows) */
  skipConfirmation?: boolean;

  /** Optional ERC-4337 sponsored flow config (Base only) */
  sponsored?: {
    bundlerClient: BundlerClient;
    smartAccountFactory: () => Promise<SmartAccount>;
  };
};
