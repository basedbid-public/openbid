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
    // Build the mint keypair signer from the hex-encoded secret.
    //    The secret is 64 bytes: first 32 = ed25519 private key, last 32 = public key.
    const privateKeyBytes = Buffer.from(privateKey, 'hex').subarray(0, 32);

    const signer =
      await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);

    return signer;
  }
  async sendTransaction(
    transaction: string,
    blockhash: string,
    lastValidBlockHeight: number,
    keyPairs?: CryptoKeyPair[],
  ) {
    // 1. Decode the base64-encoded compiled transaction
    const txBytes = getBase64Encoder().encode(transaction);
    const decodedTx = getTransactionDecoder().decode(txBytes);

    // 2. Attach the blockhash lifetime
    const compiledTx = {
      ...decodedTx,
      lifetimeConstraint: {
        blockhash,
        lastValidBlockHeight: BigInt(lastValidBlockHeight),
      },
    };

    // 3. Sign with the user's keypair
    const signedTx = await signTransaction(
      [this.keyPairSigner.keyPair, ...(keyPairs ?? [])],
      compiledTx,
    );

    // 4. Narrow the size brand for sendAndConfirm
    assertIsTransactionWithinSizeLimit(signedTx);

    // 5. Send the transaction
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
    // 6. Poll getSignatureStatuses until finalized
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

    console.log('Transaction finalized:', signature);
    console.log(
      `Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  }
}
