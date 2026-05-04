import { SendContractTransactionParams } from 'types/send-contract-parameters';
import type { Abi, TransactionReceipt, WriteContractParameters } from 'viem';

export async function sendTransaction(
  params: SendContractTransactionParams,
): Promise<TransactionReceipt> {
  const {
    publicClient,
    walletClient,
    account,
    address,
    abi,
    functionName,
    args,
    value,
    receiptTimeoutMs = 120_000,
    explorerTxUrl,
    errorLabel = 'Transaction',
  } = params;

  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address,
      abi: abi as Abi,
      functionName,
      args,
      account,
      value,
    });

    console.log('Gas estimate:', gasEstimate.toString());

    console.log('Sending transaction...');

    const hash = await walletClient.writeContract({
      address,
      abi: abi as Abi,
      functionName,
      args,
      gas: gasEstimate,
      value,
    } as WriteContractParameters);

    console.log('Transaction sent! Hash:', hash);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: receiptTimeoutMs,
    });

    console.log('Transaction confirmed!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('Status:', receipt.status === 'success' ? 'Success' : 'Failed');
    if (explorerTxUrl) {
      console.log('Tx URL:', explorerTxUrl(hash));
    }

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted at block ${receipt.blockNumber}`);
    }

    return receipt;
  } catch (error) {
    console.error(`${errorLabel} failed:`, error);
    throw error;
  }
}
