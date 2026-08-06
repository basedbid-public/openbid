import {
  assertIsTransactionWithinSizeLimit,
  Base64EncodedWireTransaction,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  KeyPairSigner,
  Rpc,
  Signature,
  signTransaction,
  TransactionMessageBytesBase64,
} from '@solana/kit';

import { SolanaRpcApiDevnet } from '@solana/kit';
import bs58 from 'bs58';
import { createInterface } from 'readline';
import { BasedBidApi } from './based-bid-api';
import { printNextSteps } from './next-steps';

/** Pre-sign safety data gathered from the RPC for the confirmation preview. */
interface TransactionPreflight {
  feePayer: string;
  /** Base fee for the message in lamports, or null if the RPC call failed. */
  feeLamports: bigint | null;
  /** Simulated net lamport change for the user's wallet, or null if unavailable. */
  balanceChangeLamports: bigint | null;
}

export class SolanaWrapper {
  private rpc!: Rpc<SolanaRpcApiDevnet>;
  private keyPairSigner!: KeyPairSigner;
  private rpcUrl = '';
  private cluster: 'mainnet' | 'devnet' = 'devnet';

  private privateKey: string;

  constructor(privateKey?: string) {
    if (!privateKey) {
      printNextSteps('What To Try Next', [
        'Run `npm run wallet:solana` to generate a new wallet.',
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
    this.cluster = chainId === 501 ? 'mainnet' : 'devnet';
    // SOLANA_RPC_URL lets users verify server-built transactions against an
    // RPC they trust instead of the basedbid proxy (which also serves the API
    // that builds the transactions being verified).
    this.rpcUrl =
      process.env.SOLANA_RPC_URL || BasedBidApi.solanaRpcUrl(chainId);
    this.rpc = createSolanaRpc(this.rpcUrl);
  }

  get networkLabel() {
    return this.cluster === 'mainnet' ? 'Solana Mainnet' : 'Solana Devnet';
  }

  explorerTxUrl(signature: string) {
    const suffix = this.cluster === 'mainnet' ? '' : '?cluster=devnet';
    return `https://explorer.solana.com/tx/${signature}${suffix}`;
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
    const skipRequested =
      skipConfirmation || process.env.SKIP_TX_CONFIRMATION === 'true';

    if (skipRequested) {
      // Unattended signing on mainnet moves real funds - require a separate,
      // explicit opt-in instead of honoring the general skip flags.
      if (
        this.cluster === 'mainnet' &&
        process.env.ALLOW_MAINNET_SKIP_CONFIRMATION !== 'true'
      ) {
        console.log(
          'Mainnet detected: the transaction prompt cannot be skipped. ' +
            'Set ALLOW_MAINNET_SKIP_CONFIRMATION=true to allow unattended mainnet signing.',
        );
      } else {
        return true;
      }
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

  /**
   * Verify a server-built transaction against the RPC BEFORE the user is asked
   * to sign it: assert the user's wallet is actually a listed signer, fetch the
   * real network fee for the message, simulate execution, and report the
   * simulated net balance change for the user's wallet. A simulation that
   * errors aborts the flow; RPC hiccups on fee/balance lookups only degrade
   * the preview (values shown as unavailable).
   */
  private async preflightTransaction(
    transaction: string,
    decodedTx: ReturnType<ReturnType<typeof getTransactionDecoder>['decode']>,
  ): Promise<TransactionPreflight> {
    const signerAddresses = Object.keys(decodedTx.signatures);
    if (!signerAddresses.includes(this.publicKey)) {
      throw new Error(
        `Refusing to sign: the server-built transaction does not list your wallet (${this.publicKey}) as a required signer.`,
      );
    }
    // Static account #0 is always the fee payer on Solana.
    const feePayer = signerAddresses[0] ?? this.publicKey;

    let feeLamports: bigint | null = null;
    try {
      const messageBase64 = getBase64Decoder().decode(
        decodedTx.messageBytes,
      ) as unknown as TransactionMessageBytesBase64;
      const { value } = await this.rpc
        .getFeeForMessage(messageBase64, { commitment: 'confirmed' })
        .send();
      feeLamports = value ?? null;
    } catch {
      feeLamports = null;
    }

    let balanceChangeLamports: bigint | null = null;
    try {
      const [{ value: preLamports }, simulation] = await Promise.all([
        this.rpc.getBalance(this.publicKey, { commitment: 'confirmed' }).send(),
        this.rpc
          .simulateTransaction(transaction as Base64EncodedWireTransaction, {
            encoding: 'base64',
            sigVerify: false,
            replaceRecentBlockhash: true,
            accounts: { encoding: 'base64', addresses: [this.publicKey] },
          })
          .send(),
      ]);

      if (simulation.value.err) {
        const logs = (simulation.value.logs ?? []).slice(-5).join('\n  ');
        // RPC error objects can contain BigInt values - plain JSON.stringify throws.
        const err = JSON.stringify(simulation.value.err, (_key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        );
        throw new Error(
          `Transaction simulation failed - refusing to sign.\nError: ${err}${logs ? `\nLogs:\n  ${logs}` : ''}`,
        );
      }

      const postLamports = simulation.value.accounts?.[0]?.lamports;
      if (postLamports != null) {
        balanceChangeLamports = BigInt(postLamports) - BigInt(preLamports);
      }
    } catch (error) {
      // Only simulation *errors* are fatal; an unreachable RPC downgrades the
      // preview instead of blocking the launch.
      if (
        error instanceof Error &&
        error.message.includes('Transaction simulation failed')
      ) {
        throw error;
      }
      balanceChangeLamports = null;
    }

    return { feePayer, feeLamports, balanceChangeLamports };
  }

  /** Fallback fee estimate from the decoded signature count (base fee only). */
  estimateTransactionFee(transaction: string): bigint {
    try {
      const txBytes = getBase64Encoder().encode(transaction);
      const decodedTx = getTransactionDecoder().decode(txBytes);
      const numSignatures = Math.max(
        1,
        Object.keys(decodedTx.signatures).length,
      );
      return BigInt(numSignatures * this.BASE_FEE_PER_SIGNATURE);
    } catch {
      return BigInt(this.BASE_FEE_PER_SIGNATURE * 2);
    }
  }

  private formatSignedLamports(lamports: bigint): string {
    const abs = lamports < 0n ? -lamports : lamports;
    const sign = lamports < 0n ? '-' : '+';
    return `${sign}${this.formatLamports(abs)}`;
  }

  showTransactionCostPreview(
    transaction: string,
    value?: string,
    description: string = 'Transaction',
    preflight?: TransactionPreflight,
  ): void {
    console.log('\nTransaction Cost Preview');
    console.log('----------------------------------------');
    console.log(`Description: ${description}`);
    console.log(`Network:     ${this.networkLabel}`);
    console.log(`RPC:         ${this.rpcUrl}`);

    if (preflight) {
      const payerNote =
        preflight.feePayer === this.publicKey
          ? '(your wallet)'
          : `(NOT your wallet - review carefully)`;
      console.log(`Fee payer:   ${preflight.feePayer} ${payerNote}`);
      console.log(
        `Network fee: ${
          preflight.feeLamports != null
            ? this.formatLamports(preflight.feeLamports)
            : `unavailable (est. ${this.formatLamports(this.estimateTransactionFee(transaction))})`
        }`,
      );
      console.log(
        `Simulated balance change: ${
          preflight.balanceChangeLamports != null
            ? `${this.formatSignedLamports(preflight.balanceChangeLamports)} (your wallet)`
            : 'unavailable (simulation could not be completed)'
        }`,
      );
    }

    if (value) {
      console.log(`Server estimate: ${value}`);
    } else if (!preflight) {
      console.log(
        `Estimated:   ${this.formatLamports(this.estimateTransactionFee(transaction))}`,
      );
    }
    console.log('');
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

    const txBytes = getBase64Encoder().encode(transaction);
    const decodedTx = getTransactionDecoder().decode(txBytes);

    // Verify the server-built transaction before showing the prompt so the
    // user confirms against real data (fee, simulated balance change) instead
    // of signing blind.
    const preflight = await this.preflightTransaction(transaction, decodedTx);

    this.showTransactionCostPreview(transaction, value, description, preflight);

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
    const POLL_INTERVAL_MS = 2000;
    const TIMEOUT_MS = 120_000;
    // Transient RPC failures (rate-limited devnet proxy returning 429/502)
    // must not kill the poll loop - the tx may already be finalized on-chain.
    const MAX_CONSECUTIVE_POLL_ERRORS = 10;
    const startedAt = Date.now();
    let pollCount = 0;
    let consecutiveErrors = 0;

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

      let status;
      try {
        const { value } = await this.rpc
          .getSignatureStatuses([signature], { searchTransactionHistory: true })
          .send();
        status = value[0];
        consecutiveErrors = 0;
      } catch (pollErr) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
          if (process.stdout.isTTY) {
            process.stdout.write('\n');
          }
          throw pollErr;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

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
    console.log(`Explorer: ${this.explorerTxUrl(signature)}`);
    console.log('');
  }
}
