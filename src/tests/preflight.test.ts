/**
 * Tests for the SolanaWrapper pre-sign safety layer. Run with: npm run test:preflight
 *
 * The offline section always runs (signer refusal, network labeling). The RPC
 * section exercises the exact call shapes preflightTransaction uses
 * (getFeeForMessage / simulateTransaction with account snapshots / getBalance)
 * against live devnet using the captured tx1-response.json; it SKIPs cleanly
 * (exit 0) when the RPC is unreachable so offline runs don't fail.
 */
import {
  Base64EncodedWireTransaction,
  createSolanaRpc,
  getBase64Decoder,
  getBase64Encoder,
  getTransactionDecoder,
  TransactionMessageBytesBase64,
} from '@solana/kit';
import { SolanaWrapper } from '@utils';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';
import 'dotenv/config';
import txResponse from '../../tx1-response.json';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) {
    pass++;
    console.log(`PASS  ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}${detail ? ` (${detail})` : ''}`);
  }
};

const isTransportError = (e: unknown) =>
  e instanceof Error &&
  (e.message.includes('fetch failed') || e.message.includes('Timeout'));

const run = async () => {
  const transaction: string = txResponse.transaction;
  const decoded = getTransactionDecoder().decode(
    getBase64Encoder().encode(transaction),
  );
  const feePayer = Object.keys(decoded.signatures)[0]!;

  // --- Offline checks ---

  const randomKey = bs58.encode(randomBytes(64));
  const wrapper = new SolanaWrapper(randomKey);
  await wrapper.init(5011);

  check(
    'devnet chainId labels network as Devnet',
    wrapper.networkLabel === 'Solana Devnet',
  );
  check(
    'devnet explorer link carries ?cluster=devnet',
    wrapper.explorerTxUrl('sig').endsWith('?cluster=devnet'),
  );

  const mainnetWrapper = new SolanaWrapper(randomKey);
  await mainnetWrapper.init(501);
  check(
    'mainnet chainId labels network as Mainnet',
    mainnetWrapper.networkLabel === 'Solana Mainnet',
  );
  check(
    'mainnet explorer link has no cluster param',
    !mainnetWrapper.explorerTxUrl('sig').includes('cluster='),
  );

  // A wallet that is not a listed signer must be refused BEFORE any prompt,
  // signing, or RPC traffic.
  try {
    await wrapper.sendTransaction(
      transaction,
      txResponse.blockhash,
      txResponse.lastValidBlockHeight,
      undefined,
      [],
      { description: 'preflight test', skipConfirmation: true },
    );
    check('non-signer wallet refused before signing', false);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    check(
      'non-signer wallet refused before signing',
      msg.includes('Refusing to sign'),
      msg.includes('Refusing to sign') ? undefined : msg.slice(0, 100),
    );
  }

  // --- Live RPC call-shape checks (skip cleanly when unreachable) ---

  const rpc = createSolanaRpc('https://cdn.based.bid/api/rpc/solana/devnet');

  try {
    const messageBase64 = getBase64Decoder().decode(
      decoded.messageBytes,
    ) as unknown as TransactionMessageBytesBase64;
    const { value: fee } = await rpc
      .getFeeForMessage(messageBase64, { commitment: 'confirmed' })
      .send();
    check(
      'getFeeForMessage call shape accepted',
      true,
      fee === null ? 'null fee for expired blockhash - handled' : `fee=${fee}`,
    );

    const sim = await rpc
      .simulateTransaction(transaction as Base64EncodedWireTransaction, {
        encoding: 'base64',
        sigVerify: false,
        replaceRecentBlockhash: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accounts: { encoding: 'base64', addresses: [feePayer as any] },
      })
      .send();
    // Any structured response (even a simulation err for this stale captured
    // tx) proves the request shape; only transport/param errors fail.
    check(
      'simulateTransaction call shape accepted',
      sim.value !== undefined,
      `err=${JSON.stringify(sim.value.err, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { value: balance } = await rpc.getBalance(feePayer as any).send();
    check('getBalance call shape accepted', typeof balance === 'bigint');
  } catch (e) {
    if (isTransportError(e)) {
      console.log('SKIP  live RPC checks (devnet RPC unreachable)');
    } else {
      check('live RPC checks', false, (e as Error).message.slice(0, 150));
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
