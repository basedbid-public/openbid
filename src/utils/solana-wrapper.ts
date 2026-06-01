import {
  assertIsTransactionWithinSizeLimit,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  KeyPairSigner,
  Rpc,
  Signature,
  signTransaction,
} from '@solana/kit';

import { SolanaRpcApiDevnet } from '@solana/kit';
import bs58 from 'bs58';
import { createInterface } from 'readline';
import { BasedBidApi } from './based-bid-api';
import { printNextSteps } from './next-steps';

export class SolanaWrapper {
  private rpc!: Rpc<SolanaRpcApiDevnet>;
  private keyPairSigner!: KeyPairSigner;
  private rpcUrl = '';

  private privateKey: string;

  constructor(privateKey?: string) {
    if (!privateKey) {
      printNextSteps('What To Try Next', [
        'Run npm run wallet:solana.',
        'Fund the printed wallet address at https://faucet.solana.com.',
        'Rerun the same Solana command.',
      ]);
      throw new Error('SOLANA_PRIVATE_KEY missing');
    }
    this.privateKey = privateKey;
  }

  async init(chainId: number) {
    const decoded = bs58.decode(this.privateKey).slice(0, 32);
    this.keyPairSigner = await createKeyPairSignerFromPrivateKeyBytes(decoded);
    this.rpcUrl = BasedBidApi.solanaRpcUrl(chainId);
    this.rpc = createSolanaRpc(this.rpcUrl);
  }

  get publicKey() {
    return this.keyPairSigner.address;
  }

  private LAMPORTS_PER_SOL = 1_000_000_000;
  private BASE_FEE_PER_SIGNATURE = 5000;

  formatElapsed = (startedAt: number): string => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    return `${elapsedSeconds}s`;
  };

  formatLamports = (lamports: bigint): string => {
    const sol = Number(lamports) / this.LAMPORTS_PER_SOL;
    if (sol < 0.0001) {
      return `${lamports.toString()} lamports`;
    }
    return `${sol.toFixed(6)} SOL`;
  };

  askConfirmation = async (
    question: string,
    skipConfirmation: boolean,
  ): Promise<boolean> => {
    if (skipConfirmation || process.env.SKIP_TX_CONFIRMATION === 'true') {
      return true;
    }

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

  async getSignerFromPrivateKey(privateKey: string) {
    const privateKeyBytes = Buffer.from(privateKey, 'hex').subarray(0, 32);

    const signer =
      await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);

    return signer;
  }

  estimateTransactionFee(transaction: string): bigint {
    try {
      const txBytes = getBase64Encoder().encode(transaction);
      const numSignatures =
        txBytes.length > 0 ? Math.max(1, Math.ceil(txBytes.length / 64)) : 1;
      const estimatedFee = BigInt(numSignatures * this.BASE_FEE_PER_SIGNATURE);

      return estimatedFee;
    } catch {
      return BigInt(this.BASE_FEE_PER_SIGNATURE * 2);
    }
  }

  showTransactionCostPreview(
    transaction: string,
    value?: string,
    description: string = 'Transaction',
  ): void {
    console.log('\nTransaction Cost Preview');
    console.log('----------------------------------------');
    console.log(`Description: ${description}`);
    console.log(`Network:     Solana Devnet`);
    console.log(`RPC:         ${this.rpcUrl}`);

    if (!value) {
      const estimatedFee = this.estimateTransactionFee(transaction);
      value = this.formatLamports(estimatedFee);
    }

    console.log(`Estimated:   ${value}\n`);
  }

  async sendTransaction(
    transaction: string,
    blockhash: string,
    lastValidBlockHeight: number,
    value?: string,
    keyPairs?: CryptoKeyPair[],
    options?: {
      skipConfirmation?: boolean;
      description?: string;
    },
  ) {
    const { skipConfirmation = false, description = 'Transaction' } =
      options || {};

    this.showTransactionCostPreview(transaction, value, description);

    const shouldProceed = await this.askConfirmation(
      'Do you want to proceed? (y/n): ',
      skipConfirmation,
    );

    if (!shouldProceed) {
      console.log('Transaction cancelled by user.');
      printNextSteps('Resume When Ready', [
        'Rerun the same command when you want to continue.',
        'Answer y at the transaction prompt to submit on-chain.',
      ]);
      process.exit(0);
    }

    const txBytes = getBase64Encoder().encode(transaction);
    const decodedTx = getTransactionDecoder().decode(txBytes);

    const compiledTx = {
      ...decodedTx,
      lifetimeConstraint: {
        blockhash,
        lastValidBlockHeight: BigInt(lastValidBlockHeight),
      },
    };

    const signedTx = await signTransaction(
      [this.keyPairSigner.keyPair, ...(keyPairs ?? [])],
      compiledTx,
    );

    assertIsTransactionWithinSizeLimit(signedTx);

    const signature = getSignatureFromTransaction(signedTx);
    const wireTransaction = getBase64EncodedWireTransaction(signedTx);

    console.log(`Sending transaction: ${signature}`);

    await this.rpc
      .sendTransaction(wireTransaction, {
        encoding: 'base64',
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
      .send();

    return signature;
  }

  async awaitTxConfirmation(signature: Signature) {
    const POLL_INTERVAL_MS = 1000;
    const TIMEOUT_MS = 90_000;
    const startedAt = Date.now();
    let pollCount = 0;

    console.log('\nWaiting for TX confirmation...');

    while (true) {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        if (process.stdout.isTTY) {
          process.stdout.write('\n');
        }
        throw new Error(
          `Transaction ${signature} not finalized within ${TIMEOUT_MS}ms`,
        );
      }

      pollCount += 1;
      if (process.stdout.isTTY) {
        process.stdout.write(
          `\rChecking status ${'.'.repeat((pollCount % 3) + 1).padEnd(3, ' ')} ${this.formatElapsed(startedAt)}`,
        );
      } else {
        console.log(`Checking status... ${this.formatElapsed(startedAt)}`);
      }

      const { value } = await this.rpc
        .getSignatureStatuses([signature], { searchTransactionHistory: true })
        .send();
      const status = value[0];

      if (status?.err) {
        if (process.stdout.isTTY) {
          process.stdout.write('\n');
        }
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (status?.confirmationStatus === 'finalized') {
        break;
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }

    console.log('\nSUCCESS: Transaction Confirmed');
    console.log('----------------------------------------');
    console.log(`Signature: ${signature}`);
    console.log(
      `Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
    console.log('');
  }
}
