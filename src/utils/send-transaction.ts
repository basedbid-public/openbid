import { createInterface } from 'readline';
import { SendContractTransactionParams } from 'types/send-contract-parameters';
import type { Abi, TransactionReceipt, WriteContractParameters } from 'viem';

const formatEther = (wei: bigint): string => {
  const ether = Number(wei) / 1e18;
  if (ether < 0.0001) {
    return `${wei.toString()} wei`;
  }
  return `${ether.toFixed(6)} ETH`;
};

const askConfirmation = (question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
    });
  });
};

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
    skipConfirmation = false,
  } = params;

  try {
    const [gasEstimate, gasPrice] = await Promise.all([
      publicClient.estimateContractGas({
        address,
        abi: abi as Abi,
        functionName,
        args,
        account,
        value,
      }),
      publicClient.getGasPrice(),
    ]);

    const gasCostWei = gasEstimate * gasPrice;
    const totalCostWei = gasCostWei + value;

    console.log('\n========================================');
    console.log('       Transaction Cost Preview');
    console.log('========================================');
    console.log(`  Function:   ${functionName}`);
    console.log(`  To:         ${address}`);
    console.log(`  Gas units:  ${gasEstimate.toString()}`);
    console.log(`  Gas price:  ${gasPrice.toString()} wei`);
    console.log(`  Gas cost:   ${formatEther(gasCostWei)}`);
    if (value > 0n) {
      console.log(`  Value:      ${formatEther(value)}`);
    }
    console.log('----------------------------------------');
    console.log(`  TOTAL:      ${formatEther(totalCostWei)}`);
    console.log('========================================\n');

    const shouldProceed =
      skipConfirmation ||
      process.env.SKIP_TX_CONFIRMATION === 'true' ||
      (await askConfirmation('Do you want to proceed? (y/n): '));

    if (!shouldProceed) {
      console.log('Transaction cancelled by user.');
      process.exit(0);
    }

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

    console.log('\n========================================');
    console.log('       Transaction Confirmed!');
    console.log('========================================');
    console.log('Block number:', receipt.blockNumber?.toString());
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('Status:', receipt.status === 'success' ? 'Success' : 'Failed');
    if (explorerTxUrl) {
      console.log('Tx URL:', explorerTxUrl(hash));
    }
    console.log('========================================\n');

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted at block ${receipt.blockNumber}`);
    }

    console.log('Receipt:', receipt);
    return receipt;
  } catch (error) {
    console.error(`${errorLabel} failed:`, error);
    throw error;
  }
}
