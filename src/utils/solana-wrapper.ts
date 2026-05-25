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

const LAMPORTS_PER_SOL = 1_000_000_000;
const BASE_FEE_PER_SIGNATURE = 5000;

const formatLamports = (lamports: bigint): string => {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  if (sol < 0.0001) {
    return `${lamports.toString()} lamports`;
  }
  return `${sol.toFixed(6)} SOL`;
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

export class SolanaWrapper {
  private rpc!: Rpc<SolanaRpcApiDevnet>;
  private keyPairSigner!: KeyPairSigner;

  private privateKey: string;

  constructor(
    private rpcUrl: string,
    privateKey?: string,
  ) {
    if (!privateKey) {
      throw new Error('SOLANA_API_KEY missing');
    }
    this.privateKey = privateKey;
  }

  async init() {
    const decoded = bs58.decode(this.privateKey).slice(0, 32);
    this.keyPairSigner = await createKeyPairSignerFromPrivateKeyBytes(decoded);
    this.rpc = createSolanaRpc(this.rpcUrl);
  }

  get publicKey() {
    return this.keyPairSigner.address;
  }

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
      const estimatedFee = BigInt(numSignatures * BASE_FEE_PER_SIGNATURE);

      return estimatedFee;
    } catch {
      return BigInt(BASE_FEE_PER_SIGNATURE * 2);
    }
  }

  showTransactionCostPreview(
    transaction: string,
    description: string = 'Transaction',
  ): void {
    console.log('\n========================================');
    console.log('       Transaction Cost Preview');
    console.log('========================================');
    console.log(`  Description: ${description}`);
    console.log(`  Network:     Solana Devnet`);
    console.log(`  RPC:         ${this.rpcUrl}`);

    const estimatedFee = this.estimateTransactionFee(transaction);

    console.log('----------------------------------------');
    console.log(`  Estimated fee: ${formatLamports(estimatedFee)}`);
    console.log('========================================\n');
  }

  async sendTransaction(
    transaction: string,
    blockhash: string,
    lastValidBlockHeight: number,
    keyPairs?: CryptoKeyPair[],
    options?: {
      skipConfirmation?: boolean;
      description?: string;
    },
  ) {
    const { skipConfirmation = false, description = 'Transaction' } =
      options || {};

    this.showTransactionCostPreview(transaction, description);

    const shouldProceed =
      skipConfirmation ||
      process.env.SKIP_TX_CONFIRMATION === 'true' ||
      (await askConfirmation('Do you want to proceed? (y/n): '));

    if (!shouldProceed) {
      console.log('Transaction cancelled by user.');
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

    console.log('Sending transaction:', signature);

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

    while (true) {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        throw new Error(
          `Transaction ${signature} not finalized within ${TIMEOUT_MS}ms`,
        );
      }

      const { value } = await this.rpc
        .getSignatureStatuses([signature], { searchTransactionHistory: true })
        .send();
      const status = value[0];

      if (status?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (status?.confirmationStatus === 'finalized') {
        break;
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    console.log('\n========================================');
    console.log('       Transaction Confirmed!');
    console.log('========================================');
    console.log(`Signature: ${signature}`);
    console.log(
      `Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
    console.log('========================================\n');
  }
}
