import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { SellSolanaResponse } from 'interfaces/sell/solana/response';
import { validateEnvironmentSolana } from 'schema/environment';
import {
  SellSolanaApi,
  sellSolanaApiPayloadSchema,
} from 'schema/sell/solana/api';
import { SellSolanaSdk, sellSolanaSdkSchema } from 'schema/sell/solana/sdk';
import { BasedBidApi } from 'utils/based-bid-api';
import { SolanaWrapper } from 'utils/solana-wrapper';

export const solanaLbpSell = async (
  args: SellSolanaSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nSolana LBP Sell - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironmentSolana();

  const data = sellSolanaSdkSchema.parse(args);

  if (dryRun?.printPayload) {
    console.log('Chain ID:', data.chainId);
    console.log('Token Mint:', data.address);
    console.log('Amount:', data.amount);
    console.log('Slippage:', data.slippage, '%');
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const payload: SellSolanaApi = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
  };

  if (dryRun?.printPayload) {
    console.log('Signer (from wallet):', solanaWrapper.publicKey);
    console.log('\nAPI Payload for /sol/lbp-sell:');
    console.log(JSON.stringify(payload, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /sol/lbp-sell (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /sol/lbp-sell');
    console.log('Token Mint:', data.address);
    console.log('Amount:', data.amount);
    console.log('========================================\n');
    return { dryRun: true, payload };
  }

  const validated = sellSolanaApiPayloadSchema.parse(payload);

  const json = await BasedBidApi.invokeApi<SellSolanaResponse>(
    ApiType.SDK,
    'sol/lbp-sell',
    validated,
    `Failed to sell ${data.address} on Solana`,
    data.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    {
      description: `Sell ${data.amount} tokens`,
      skipConfirmation: data.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
