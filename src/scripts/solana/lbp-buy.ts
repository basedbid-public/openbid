import {
  SOLANA_CHAIN_NAME_CONFIG,
  SOLANA_CHAIN_SLUG_CONFIG,
} from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { OpenbidRunOptions, SolanaApiResponse } from 'interfaces/common';
import { BuySolanaSdk, buySolanaSdkSchema } from 'schema/buy/solana/sdk';
import { BasedBidApi, LogHelper, SolanaValidator, SolanaWrapper } from 'utils';

export const solanaLbpBuy = async (
  args: BuySolanaSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = options ?? {};

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Buying LBP on Solana - - -');
  }

  const { data, env } = SolanaValidator.validate<BuySolanaSdk>(
    buySolanaSdkSchema,
    args,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
  await solanaWrapper.init(data.chainId);

  const apiPayload = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
    referrer: data.referrer,
    isSandboxMode: data.isSandboxMode,
  };

  if (printPayload) {
    LogHelper.printApiPayload('sol/lbp-buy', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('sol/lbp-buy', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<SolanaApiResponse>(
    ApiType.SDK,
    'sol/lbp-buy',
    apiPayload,
    `Failed to buy ${data.address} on Solana`,
    data.isSandboxMode,
  );
  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    [],
    {
      description: `Buy ${data.amount} tokens`,
      skipConfirmation: data.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  LogHelper.printResult({
    ok: true,
    network: SOLANA_CHAIN_NAME_CONFIG[data.chainId],
    tokenAddress: data.address,
    amount: data.amount,
    signature,
    basedBidUrl: `${BasedBidApi.platformApiUrl(data.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[data.chainId]}/token/${data.address}`,
  });
};
