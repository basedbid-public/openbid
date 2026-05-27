import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { BuySolanaResponse } from 'interfaces/buy/solana/api-response';
import { buySolanaApiSchema } from 'schema/buy/solana/api';
import { BuySolanaSdk, buySolanaSdkSchema } from 'schema/buy/solana/sdk';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const solanaLbpBuy = async (
  args: BuySolanaSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nSolana LBP Buy - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironmentSolana();

  const data = buySolanaSdkSchema.parse(args);

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

  const apiPayload = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
    referrer: data.referrer,
    isSandboxMode: data.isSandboxMode,
  };

  if (dryRun?.printPayload) {
    console.log('Signer (from wallet):', solanaWrapper.publicKey);
    console.log('\nAPI Payload for /sol/lbp-buy:');
    console.log(JSON.stringify(apiPayload, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /sol/lbp-buy (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /sol/lbp-buy');
    console.log('Token Mint:', data.address);
    console.log('Amount:', data.amount);
    console.log('========================================\n');
    return { dryRun: true, payload: apiPayload };
  }

  const validated = buySolanaApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<BuySolanaResponse>(
    ApiType.SDK,
    'sol/lbp-buy',
    validated,
    `Failed to buy ${data.address} on Solana`,
    data.isSandboxMode,
  );
  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    {
      description: `Buy ${data.amount} tokens`,
      skipConfirmation: data.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
